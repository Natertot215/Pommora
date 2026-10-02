import { basename, dirname, join, relative } from '../Paths/posix'
import { excludedWithin } from '../Settings/settings'
import { stampedId } from '../Files/pageFile'
import type { ContextDef, ContextsRegistry } from '../Contexts/contexts'
import type { Result } from '../Contract/result'
import { liveTreeOf } from '../Nexus/liveTree'
import { containerAt } from '../Nexus/treePatch'
import type { SweepCapture, UnlinkOutcome } from '../Contexts/contextCascade'
import { readJsonObject, readTextOrNull } from '../Files/atomicWrite'
import { spaceIdsIn } from '../Contexts/spaceSidecar'
import { SIDECAR_FILENAME, SPACE_SIDECAR } from '../Paths/nexusPaths'

import type { RecordFile, ParentRef } from './record'
import type { ContainerKind } from '../Nexus/entities'

const sidecarId = async (absFolder: string, name: string): Promise<string | undefined> => {
  const raw = await readJsonObject(join(absFolder, name))
  return typeof raw?.id === 'string' ? raw.id : undefined
}

async function gatherParentRef(root: string, absEntity: string): Promise<ParentRef> {
  const parentDir = dirname(absEntity)
  if (parentDir === root) return { kind: 'root' }
  const id = containerAt(await liveTreeOf(root), relative(root, parentDir))?.id
  return id ? { kind: 'container', id } : { kind: 'unaddressable' }
}

export async function gatherContentRecord(
  root: string,
  kind: 'page' | ContainerKind,
  abs: string,
): Promise<RecordFile> {
  const parent = await gatherParentRef(root, abs)
  const id =
    kind === 'page'
      ? stampedId((await readTextOrNull(abs)) ?? '')
      : await sidecarId(abs, SIDECAR_FILENAME[kind])
  return {
    entity: kind,
    ...(id ? { id } : {}),
    parent,
    ...(kind === 'page' ? {} : { excluded: await excludedWithin(root, relative(root, abs)) }),
  }
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

interface ContextEvidence {
  entry: ContextDef
  at: number
  spaceIds: Map<string, string>
  unresolved: boolean
}

export async function gatherContextEvidence(
  abs: string,
  entry: ContextDef,
  at: number,
): Promise<ContextEvidence> {
  const { ids: spaceIds, unread: unresolved } = await spaceIdsIn(abs)
  return { entry: { ...entry }, at, spaceIds, unresolved }
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
    at: evidence.at,
    membership,
    ...(partial ? { partial: true as const } : {}),
  }
}
