// Gathering a departing entity's record: the payload each kind must carry before anything is
// destroyed, and the parent reference that degrades rather than refusing.

import type { Dirent } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import type { ContextsRegistry } from '../Properties/contexts'
import { contentId } from '../Nexus/identityMark'
import type { Result } from '../Contract/result'
import { ensureFolderId } from '../Nexus/adopt'
import type { SweepCapture, UnlinkOutcome } from '../Contexts/contextCascade'
import { pathExists, readJsonObject } from '../IO/atomicWrite'
import { SIDECAR_FILENAME, SPACE_SIDECAR } from '../Locations/paths'
import { splitFrontmatter } from '../Nexus/readNexus'
import type { RecordFile, ParentRef } from './record'

const sidecarId = async (absFolder: string, name: string): Promise<string | undefined> => {
  const raw = await readJsonObject(join(absFolder, name))
  return typeof raw?.id === 'string' ? raw.id : undefined
}

/** The parent of a content entity: the nexus root, a container by sidecar id, or `unaddressable`.
 *
 *  A folder the filesystem handed Pommora — made in Finder, or by an agent — carries no persisted
 *  id until an open stamps it, and the tree's placeholder for it is a path hash, which this record
 *  may never store. So the parent is given an identity before it is named by one; only a sidecar
 *  that exists and cannot be read stays `unaddressable`, because minting over it would destroy the
 *  schema and views it still holds. */
async function gatherParentRef(root: string, absEntity: string): Promise<ParentRef> {
  const parentDir = dirname(absEntity)
  if (parentDir === root) return { kind: 'root' }
  const read = async (): Promise<string | undefined> =>
    (await sidecarId(parentDir, SIDECAR_FILENAME.set)) ??
    (await sidecarId(parentDir, SIDECAR_FILENAME.collection))
  let id = await read()
  if (!id) {
    await ensureFolderId(root, parentDir)
    id = await read()
  }
  return id ? { kind: 'container', id } : { kind: 'unaddressable' }
}

export async function gatherContentRecord(
  root: string,
  kind: 'page' | 'collection' | 'set',
  abs: string,
): Promise<RecordFile> {
  const parent = await gatherParentRef(root, abs)
  const id =
    kind === 'page'
      ? contentId(splitFrontmatter(await readFile(abs, 'utf8').catch(() => '')))
      : await sidecarId(abs, SIDECAR_FILENAME[kind])
  return { entity: kind, ...(id ? { id } : {}), parent }
}

/** A sweep that never ran, could not read a root, or was refused one left the membership thinner
 *  than the truth — the record says so rather than reading complete. */
const sweepIncomplete = (swept: UnlinkOutcome | null): boolean =>
  swept === null || swept.skipped.length > 0 || swept.refused.length > 0

/** A Space's own id is its required payload — its sidecar unreadable means no record. The parent
 *  Context resolves through the registry read taken before the erase. */
export async function gatherSpaceRecord(
  abs: string,
  registry: Result<ContextsRegistry> | null,
  swept: UnlinkOutcome | null,
): Promise<RecordFile | null> {
  const id = await sidecarId(abs, SPACE_SIDECAR)
  if (!id) return null
  const contextTitle = basename(dirname(abs))
  const def = registry?.ok
    ? registry.value.contexts.find((c) => c.title === contextTitle)
    : undefined
  const captured = swept?.captured ?? []
  const members = captured
    .filter((c): c is SweepCapture & { id: string } => typeof c.id === 'string')
    .map((c) => ({ id: c.id, kind: c.kind }))
  // An id-less tagging root was genuinely stripped but cannot be restored — the members
  // list is thinner than the truth and the record says so.
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
 *  record) and the own-folder Space map that joins captured titles to ids. Scoped to this
 *  Context's folder deliberately: an unreadable sidecar in an UNRELATED Context is not this
 *  delete's evidence and must not suppress its record. */
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

export function buildContextRecord(
  evidence: ContextEvidence,
  swept: UnlinkOutcome | null,
): RecordFile {
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
