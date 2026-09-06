import { basename, dirname, join } from '../Locations/posix'
import type { ContextsRegistry } from '../Properties/contexts'
import { contentId } from '../Nexus/identityMark'
import type { Result } from '../Contract/result'
import { ensureFolderId } from '../Nexus/adopt'
import type { SweepCapture, UnlinkOutcome } from '../Contexts/contextCascade'
import { pathExists, readJsonObject, readTextOrNull } from '../IO/atomicWrite'
import { listEntries } from '../IO/walk'
import { SIDECAR_FILENAME, SPACE_SIDECAR } from '../Locations/paths'
import { splitFrontmatter } from '../Nexus/readNexus'
import type { RecordFile, ParentRef } from './record'

const sidecarId = async (absFolder: string, name: string): Promise<string | undefined> => {
  const raw = await readJsonObject(join(absFolder, name))
  return typeof raw?.id === 'string' ? raw.id : undefined
}

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
      ? contentId(splitFrontmatter((await readTextOrNull(abs)) ?? ''))
      : await sidecarId(abs, SIDECAR_FILENAME[kind])
  return { entity: kind, ...(id ? { id } : {}), parent }
}

const sweepIncomplete = (swept: UnlinkOutcome | null): boolean =>
  swept === null || swept.skipped.length > 0 || swept.refused.length > 0

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
  spaceIds: Map<string, string>
  unresolved: boolean
}

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
  for (const d of await listEntries(abs)) {
    if (d.kind !== 'dir') continue
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
