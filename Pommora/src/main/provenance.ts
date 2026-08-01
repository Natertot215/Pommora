// The provenance half of the record: one JSON written beside every nexus-trashed artifact,
// named from the trash primitive's final stamped destination. It records what departed and
// where it belonged — ids, never name-based locations — created by the delete, read by
// restore, deleted with its artifact, never entering the live tree.
//
// The write is best-effort and all-or-nothing per pair: a kind's REQUIRED payload failing to
// gather (a Context whose registry entry cannot be read) writes no pair at all — a missing
// pair degrades that one entity to hand-restore, where a silently incomplete one would be
// trusted by restore. The parent is not a required payload: it degrades to `unaddressable`.

import type { Dirent } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { z } from 'zod'
import type { ContextsRegistry } from '@shared/contexts'
import { contentId } from '@shared/identity'
import type { Result } from '@shared/result'
import type { SweepCapture, SweepResult } from './crud/contextCascade'
import { pathExists, readJsonObject, writeJson } from './io/atomicWrite'
import { SIDECAR_FILENAME, SPACE_SIDECAR } from './paths'
import { splitFrontmatter } from './readNexus'

export const PAIR_SUFFIX = '.provenance.json'

const parentRef = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('root') }),
  z.object({ kind: z.literal('container'), id: z.string() }),
  z.object({ kind: z.literal('context'), id: z.string() }),
  z.object({ kind: z.literal('unaddressable') }),
])

const memberRoot = z.looseObject({ id: z.string().optional(), kind: z.enum(['page', 'space']) })
const spaceRef = z.looseObject({ id: z.string().optional(), title: z.string() })

const contentPair = <E extends string>(entity: E) =>
  z.looseObject({
    entity: z.literal(entity),
    id: z.string().optional(),
    parent: parentRef,
    partial: z.literal(true).optional(),
  })

export const pairFile = z.discriminatedUnion('entity', [
  contentPair('page'),
  contentPair('collection'),
  contentPair('set'),
  z.looseObject({
    entity: z.literal('space'),
    id: z.string(),
    parent: parentRef,
    /** The id-bearing roots whose frontmatter carried this Space's tag at the delete. */
    members: z.array(memberRoot),
    partial: z.literal(true).optional(),
  }),
  z.looseObject({
    entity: z.literal('context'),
    /** The registry entry the erase destroys — a hand-restored folder returns nothing without it. */
    registry: z.looseObject({
      id: z.string(),
      title: z.string(),
      singular: z.string().optional(),
      icon: z.string().optional(),
    }),
    /** Per swept root, the Space list its stripped key held — ids joined at gather, titles as labels. */
    membership: z.array(z.looseObject({ root: memberRoot, spaces: z.array(spaceRef) })),
    partial: z.literal(true).optional(),
  }),
])

export type PairFile = z.infer<typeof pairFile>
export type ParentRef = z.infer<typeof parentRef>
export type UnlinkOutcome = SweepResult & { captured: SweepCapture[] }

export function pairPathFor(artifactDest: string): string {
  return `${artifactDest}${PAIR_SUFFIX}`
}

/** Atomic, beside the artifact — `.trash` is unwatched, so this costs no watcher event. */
export async function writePair(artifactDest: string, pair: PairFile): Promise<void> {
  await writeJson(pairPathFor(artifactDest), pair)
}

/** Null for missing, unreadable, or shape-mismatched — a pair is trusted by restore, so a
 *  file that does not validate is not a pair. */
export async function readPair(pairPath: string): Promise<PairFile | null> {
  const raw = await readJsonObject(pairPath)
  if (raw === null) return null
  const parsed = pairFile.safeParse(raw)
  return parsed.success ? parsed.data : null
}

const sidecarId = async (absFolder: string, name: string): Promise<string | undefined> => {
  const raw = await readJsonObject(join(absFolder, name))
  return typeof raw?.id === 'string' ? raw.id : undefined
}

/** The parent of a content entity, best-effort: the nexus root, a container by sidecar id, or
 *  `unaddressable` (absent, unreadable, or id-less — an address is not an identity). */
async function gatherParentRef(root: string, absEntity: string): Promise<ParentRef> {
  const parentDir = dirname(absEntity)
  if (parentDir === root) return { kind: 'root' }
  const id =
    (await sidecarId(parentDir, SIDECAR_FILENAME.set)) ??
    (await sidecarId(parentDir, SIDECAR_FILENAME.collection))
  return id ? { kind: 'container', id } : { kind: 'unaddressable' }
}

export async function gatherContentPair(
  root: string,
  kind: 'page' | 'collection' | 'set',
  abs: string,
): Promise<PairFile> {
  const parent = await gatherParentRef(root, abs)
  const id =
    kind === 'page'
      ? contentId(splitFrontmatter(await readFile(abs, 'utf8').catch(() => '')))
      : await sidecarId(abs, SIDECAR_FILENAME[kind])
  return { entity: kind, ...(id ? { id } : {}), parent }
}

const sweepPartial = (swept: UnlinkOutcome | null): { partial: true } | Record<never, never> =>
  swept === null || swept.skipped.length > 0 || swept.refused.length > 0 ? { partial: true } : {}

/** A Space's own id is its required payload — its sidecar unreadable means no pair. The parent
 *  Context resolves through the registry read taken before the erase. */
export async function gatherSpacePair(
  abs: string,
  registry: Result<ContextsRegistry> | null,
  swept: UnlinkOutcome | null,
): Promise<PairFile | null> {
  const id = await sidecarId(abs, SPACE_SIDECAR)
  if (!id) return null
  const contextTitle = basename(dirname(abs))
  const def = registry?.ok ? registry.value.contexts.find((c) => c.title === contextTitle) : undefined
  const members = (swept?.captured ?? [])
    .filter((c): c is SweepCapture & { id: string } => typeof c.id === 'string')
    .map((c) => ({ id: c.id, kind: c.kind }))
  return {
    entity: 'space',
    id,
    parent: def ? { kind: 'context', id: def.id } : { kind: 'unaddressable' },
    members,
    ...sweepPartial(swept),
  }
}

export interface ContextEvidence {
  entry: { id: string; title: string; singular?: string; icon?: string }
  /** Space title → id, from the Context's OWN folder — the scoped read, never the whole world. */
  spaceIds: Map<string, string>
  unresolved: boolean
}

/** Gather points 0 and 1 for a Context delete: the registry entry (required — null means no
 *  pair) and the own-folder Space map that joins captured titles to ids. Scoped to this
 *  Context's folder deliberately: an unreadable sidecar in an UNRELATED Context is not this
 *  delete's evidence and must not suppress its pair. */
export async function gatherContextEvidence(
  abs: string,
  title: string,
  registry: Result<ContextsRegistry>,
): Promise<ContextEvidence | null> {
  if (!registry.ok) return null
  const entry = registry.value.contexts.find((c) => c.title === title)
  if (!entry) return null
  const spaceIds = new Map<string, string>()
  let unresolved = false
  let dirs: Dirent[] = []
  try {
    dirs = await readdir(abs, { withFileTypes: true })
  } catch {
    unresolved = true
  }
  for (const d of dirs) {
    if (!d.isDirectory()) continue
    const sidecar = join(abs, d.name, SPACE_SIDECAR)
    const raw = await readJsonObject(sidecar)
    if (typeof raw?.id === 'string') spaceIds.set(d.name, raw.id)
    // Absent sidecar = a plain folder, silent; present-but-unusable marks the evidence
    // incomplete rather than silently thinning the membership join.
    else if (await pathExists(sidecar)) unresolved = true
  }
  return { entry: { ...entry }, spaceIds, unresolved }
}

export function buildContextPair(evidence: ContextEvidence, swept: UnlinkOutcome | null): PairFile {
  const membership = (swept?.captured ?? []).map((c) => ({
    root: { ...(c.id ? { id: c.id } : {}), kind: c.kind },
    spaces: c.values.map((title) => {
      const id = evidence.spaceIds.get(title)
      return id ? { id, title } : { title }
    }),
  }))
  const partial = evidence.unresolved ? { partial: true as const } : sweepPartial(swept)
  return { entity: 'context', registry: evidence.entry, membership, ...partial }
}
