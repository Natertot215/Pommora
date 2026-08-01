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
import { mkdir, readdir, readFile, rename, rm } from 'node:fs/promises'
import { basename, dirname, join, relative, sep } from 'node:path'
import { z } from 'zod'
import { contextKey, type ContextsRegistry } from '@shared/contexts'
import { contentId } from '@shared/identity'
import { fail, ok, type Result } from '@shared/result'
import type { CollectionNode, NexusTree, SetNode } from '@shared/types'
import { mutateRegistryFile } from './contextsRegistry'
import type { SweepCapture, UnlinkOutcome } from './crud/contextCascade'
import { reconcile } from './crud/reconcile'
import { sweepAdmits } from './crud/util'
import { pathExists, readJsonObject, writeJson } from './io/atomicWrite'
import { rewritePageSerialized, serializeOnFile } from './io/fileLock'
import { mergeFrontmatter, splitEnvelope } from './io/pageFile'
import { recordWrite } from './io/writeEcho'
import { SIDECAR_FILENAME, SPACE_SIDECAR } from './paths'
import { readNexus, splitFrontmatter } from './readNexus'
import { projectBaseline } from './record'

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
    entity: z.literal('property'),
    id: z.string(),
    /** The registry definition the delete removes — restore has nothing else to rebuild from. */
    def: z.looseObject({ id: z.string() }),
    /** Page id → the raw value the scrub stripped. Ids, never paths. */
    values: z.record(z.string(), z.unknown()),
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

export function pairPathFor(artifactDest: string): string {
  return `${artifactDest}${PAIR_SUFFIX}`
}

/** Atomic, beside the artifact — `.trash` is unwatched, so this costs no watcher event. */
export async function writePair(artifactDest: string, pair: PairFile): Promise<void> {
  await writeJson(pairPathFor(artifactDest), pair)
}

/** The artifact-less variant: a property delete trashes nothing, so there is no leaf to pair
 *  with — the pair lands flat in `.trash`, atomic and de-collided, and the orphan prune
 *  exempts the variant. */
export async function writePropertyPair(
  root: string,
  pair: Extract<PairFile, { entity: 'property' }>,
): Promise<string> {
  const trash = join(root, '.trash')
  await mkdir(trash, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  let dest = join(trash, `${stamp}__property-${pair.id}${PAIR_SUFFIX}`)
  for (let n = 1; await pathExists(dest); n++)
    dest = join(trash, `${stamp}__${n}__property-${pair.id}${PAIR_SUFFIX}`)
  await writeJson(dest, pair)
  return dest
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

/** A sweep that never ran, could not read a root, or was refused one left the membership thinner
 *  than the truth — the pair says so rather than reading complete. */
const sweepIncomplete = (swept: UnlinkOutcome | null): boolean =>
  swept === null || swept.skipped.length > 0 || swept.refused.length > 0

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
  const captured = swept?.captured ?? []
  const members = captured
    .filter((c): c is SweepCapture & { id: string } => typeof c.id === 'string')
    .map((c) => ({ id: c.id, kind: c.kind }))
  // An id-less tagging root was genuinely stripped but cannot be restored — the members
  // list is thinner than the truth and the pair says so.
  const partial = sweepIncomplete(swept) || members.length < captured.length
  return {
    entity: 'space',
    id,
    parent: def ? { kind: 'context', id: def.id } : { kind: 'unaddressable' },
    members,
    ...(partial ? { partial: true as const } : {}),
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
  const partial = evidence.unresolved || sweepIncomplete(swept)
  return {
    entity: 'context',
    registry: evidence.entry,
    membership,
    ...(partial ? { partial: true as const } : {}),
  }
}

// ---------- resolution ----------

export interface Placement {
  /** Nexus-relative directory the artifact re-enters; '' is the root. */
  dir: string
  /** Final basename for the artifact — extension included for pages. */
  finalName: string
  /** For a Space or Context: the final title restore writes everywhere (folder, registry,
   *  re-applied membership keys). Recorded titles are labels; this is the decision. */
  finalTitle?: string
}

export type Refusal = 'parent-gone' | 'cannot-hold' | 'unaddressable' | 'id-live'
export type Resolution = { place: Placement } | { refuse: Refusal }

/** The property variant is artifact-less — there is nothing to place. */
export type ArtifactPair = Exclude<PairFile, { entity: 'property' }>

/** The artifact's original basename, out of the trash primitive's stamped leaf. */
export function artifactBaseName(leaf: string): string {
  const parts = leaf.split('__')
  if (parts.length < 2) return leaf
  const afterStamp = parts.length > 2 && /^\d+$/.test(parts[1]) ? 2 : 1
  return parts.slice(afterStamp).join('__')
}

const fold = (s: string): string => s.normalize('NFC').toLowerCase()

/** The create convention: a name already held — case- and form-insensitively — gains a counter. */
const disambiguate = (base: string, taken: string[]): string => {
  const held = taken.map(fold)
  const isTaken = (title: string): boolean => held.includes(fold(title))
  if (!isTaken(base)) return base
  let n = 2
  while (isTaken(`${base} ${n}`)) n++
  return `${base} ${n}`
}

function findContainer(tree: NexusTree, id: string): CollectionNode | SetNode | null {
  const inSets = (sets: SetNode[] | undefined): SetNode | null => {
    for (const s of sets ?? []) {
      if (s.id === id) return s
      const hit = inSets(s.sets)
      if (hit) return hit
    }
    return null
  }
  for (const c of tree.collections) {
    if (c.id === id) return c
    const hit = inSets(c.sets)
    if (hit) return hit
  }
  return null
}

/** THE decision. A placement with final names against the CURRENT tree — a renamed parent
 *  resolves to its renamed path — or a typed refusal. The acting code branches on nothing:
 *  every name and title choice is made here, because choosing is deciding. A live id refusal
 *  outranks every other answer — nothing may write over a living identity. */
export function resolvePair(pair: ArtifactPair, baseName: string, tree: NexusTree): Resolution {
  const live = projectBaseline(tree).entries
  const pairId = pair.entity === 'context' ? pair.registry.id : pair.id
  if (pairId && live[pairId]) return { refuse: 'id-live' }

  if (pair.entity === 'context') {
    const finalTitle = disambiguate(
      pair.registry.title,
      tree.contexts.map((g) => g.def.title),
    )
    return { place: { dir: '.nexus/contexts', finalName: finalTitle, finalTitle } }
  }

  if (pair.entity === 'space') {
    const parent = pair.parent
    if (parent.kind === 'unaddressable') return { refuse: 'unaddressable' }
    if (parent.kind !== 'context') return { refuse: 'cannot-hold' }
    const group = tree.contexts.find((g) => g.def.id === parent.id)
    if (!group) return { refuse: 'parent-gone' }
    const finalTitle = disambiguate(
      baseName,
      group.spaces.map((s) => s.title),
    )
    return { place: { dir: `.nexus/contexts/${group.def.title}`, finalName: finalTitle, finalTitle } }
  }

  switch (pair.parent.kind) {
    case 'unaddressable':
      return { refuse: 'unaddressable' }
    case 'context':
      return { refuse: 'cannot-hold' }
    case 'root': {
      if (pair.entity !== 'collection') return { refuse: 'cannot-hold' }
      const finalName = disambiguate(
        baseName,
        tree.collections.map((c) => c.title),
      )
      return { place: { dir: '', finalName } }
    }
    case 'container': {
      if (pair.entity === 'collection') return { refuse: 'cannot-hold' }
      const parent = findContainer(tree, pair.parent.id)
      if (!parent) return live[pair.parent.id] ? { refuse: 'cannot-hold' } : { refuse: 'parent-gone' }
      // A page and a Set share one folder namespace — both sibling sets block both kinds.
      const siblings = [...parent.pages.map((p) => p.title), ...(parent.sets ?? []).map((s) => s.title)]
      if (pair.entity === 'page') {
        const finalTitle = disambiguate(baseName.replace(/\.md$/i, ''), siblings)
        return { place: { dir: parent.path, finalName: `${finalTitle}.md` } }
      }
      return { place: { dir: parent.path, finalName: disambiguate(baseName, siblings) } }
    }
  }
}

// ---------- the spend path ----------

export interface ListedPair {
  /** Nexus-relative pair-file path — the reference the restore op takes. */
  pairPath: string
  pair: PairFile
}

/** Every pair under `.trash`. A pair whose artifact is gone — trash emptied by hand — is an
 *  orphan pruned as encountered; the artifact-less property variant is exempt. A file that
 *  fails validation is not a pair and is never pruned. */
export async function listPairs(root: string): Promise<ListedPair[]> {
  const out: ListedPair[] = []
  const walk = async (dir: string): Promise<void> => {
    let entries: Dirent[]
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entries) {
      const abs = join(dir, e.name)
      if (e.isDirectory()) {
        await walk(abs)
        continue
      }
      if (!e.name.endsWith(PAIR_SUFFIX)) continue
      const pair = await readPair(abs)
      if (!pair) continue
      if (pair.entity !== 'property' && !(await pathExists(abs.slice(0, -PAIR_SUFFIX.length)))) {
        await rm(abs, { force: true })
        continue
      }
      out.push({ pairPath: relative(root, abs), pair })
    }
  }
  await walk(join(root, '.trash'))
  return out
}

const REFUSAL_TEXT: Record<Refusal, string> = {
  'parent-gone': 'The place this belonged to no longer exists.',
  'cannot-hold': 'The place this belonged to can no longer hold it.',
  unaddressable: 'Where this belonged was never recorded.',
  'id-live': 'Something in the nexus already carries this identity.',
}

/** Merge titles into a governed context key on one root — a page's frontmatter under its file
 *  lock, or a Space sidecar. True only when the write landed; the reconcile loop spends on it. */
async function addContextValues(
  root: string,
  entry: { kind: string; path: string } | undefined,
  key: string,
  titles: string[],
): Promise<boolean> {
  if (!entry || (entry.kind !== 'page' && entry.kind !== 'space')) return false
  const merge = (raw: Record<string, unknown>): unknown[] => {
    const existing = Array.isArray(raw[key])
      ? (raw[key] as unknown[]).filter((v): v is string => typeof v === 'string')
      : []
    return [...existing, ...titles.filter((t) => !existing.includes(t))]
  }
  if (entry.kind === 'page') {
    const abs = join(root, entry.path)
    return rewritePageSerialized(abs, (content) => {
      if (!sweepAdmits(content)) return null
      const raw = splitFrontmatter(content)
      return mergeFrontmatter(content, { [key]: merge(raw) }, [key], splitEnvelope(content).body)
    }).catch(() => false)
  }
  const file = join(root, entry.path, SPACE_SIDECAR)
  return serializeOnFile(file, async () => {
    const raw = await readJsonObject(file)
    if (!raw) return false
    await writeJson(file, { ...raw, [key]: merge(raw) })
    return true
  })
}

/** Current Space titles inside a restored Context folder, by sidecar id — the membership join
 *  runs on ids; the as-restored folder names are what gets written. */
async function restoredSpaceTitles(absContextDir: string): Promise<Map<string, string>> {
  const titles = new Map<string, string>()
  let dirs: Dirent[] = []
  try {
    dirs = await readdir(absContextDir, { withFileTypes: true })
  } catch {
    return titles
  }
  for (const d of dirs) {
    if (!d.isDirectory()) continue
    const raw = await readJsonObject(join(absContextDir, d.name, SPACE_SIDECAR))
    if (typeof raw?.id === 'string') titles.set(raw.id, d.name)
  }
  return titles
}

/** The mover: resolve against the CURRENT tree inside the op (the world may have changed since
 *  listing), place the artifact under the resolver's final names, delete the pair, and per kind
 *  re-enter the registry and re-apply membership through the shared reconcile loop. Branches on
 *  nothing — every decision is the resolver's. */
export async function restoreArtifact(root: string, pairAbs: string): Promise<Result<null>> {
  if (!pairAbs.startsWith(join(root, '.trash') + sep))
    return fail('operation-failed', 'Only a trash record can be restored.')
  const pair = await readPair(pairAbs)
  if (!pair) return fail('operation-failed', 'That restore record is unreadable.')
  if (pair.entity === 'property')
    return fail('operation-failed', 'A property record has no artifact to restore.')
  const artifactAbs = pairAbs.slice(0, -PAIR_SUFFIX.length)
  if (!(await pathExists(artifactAbs))) {
    await rm(pairAbs, { force: true })
    return fail('not-found', 'The trashed item is gone; its record was cleared.')
  }

  const tree = await readNexus(root)
  const resolution = resolvePair(pair, artifactBaseName(basename(artifactAbs)), tree)
  if ('refuse' in resolution) return fail('operation-failed', REFUSAL_TEXT[resolution.refuse])
  const { dir, finalName, finalTitle } = resolution.place

  const targetAbs = join(root, dir, finalName)
  // The tree is the resolver's universe; a file the walk cannot see (an Unknown squatter)
  // could still occupy the target — refuse rather than clobber what nothing adjudicated.
  if (await pathExists(targetAbs))
    return fail('exists', 'Something already sits at the restored location.')
  // A Context's identity lives ONLY in its registry entry, so it re-enters BEFORE anything
  // moves: a refused write leaves the pair and artifact intact — the restore is retryable —
  // where an append after the move would destroy the evidence on failure and reply ok.
  const title = finalTitle ?? finalName
  if (pair.entity === 'context') {
    const committed = await mutateRegistryFile(root, (cur) => ({
      contexts: [...cur.contexts, { ...pair.registry, title }],
    }))
    if (!committed.ok) return committed
  }
  recordWrite(artifactAbs)
  recordWrite(targetAbs)
  await mkdir(dirname(targetAbs), { recursive: true })
  await rename(artifactAbs, targetAbs)
  await rm(pairAbs, { force: true })

  const roots = projectBaseline(tree).entries
  if (pair.entity === 'context') {
    const titlesById = await restoredSpaceTitles(targetAbs)
    const key = contextKey(title)
    const additions: Record<string, string[]> = {}
    for (const m of pair.membership) {
      if (!m.root.id) continue
      const titles = m.spaces
        .map((s) => (s.id ? titlesById.get(s.id) : undefined))
        .filter((t): t is string => typeof t === 'string')
      if (titles.length) additions[m.root.id] = titles
    }
    await reapply(root, roots, contextKey(title), additions)
  } else if (pair.entity === 'space' && pair.parent.kind === 'context') {
    const parentId = pair.parent.id
    const group = tree.contexts.find((g) => g.def.id === parentId)
    if (group) {
      const additions = Object.fromEntries(
        pair.members
          .filter((m): m is typeof m & { id: string } => typeof m.id === 'string')
          .map((m) => [m.id, [title]]),
      )
      await reapply(root, roots, contextKey(group.def.title), additions)
    }
  }
  return ok(null)
}

/** Membership re-apply, spent through the shared loop — what didn't land is named, never
 *  rolled back and never silently claimed. */
async function reapply(
  root: string,
  roots: Record<string, { kind: string; path: string }>,
  key: string,
  additions: Record<string, string[]>,
): Promise<void> {
  const { kept } = await reconcile(additions, (id, titles) =>
    addContextValues(root, roots[id], key, titles),
  )
  const unspent = Object.keys(kept)
  if (unspent.length)
    console.warn(`restore: membership for ${key} did not re-apply to: ${unspent.join(', ')}`)
}
