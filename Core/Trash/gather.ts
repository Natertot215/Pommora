import { basename, dirname, isAtOrUnder, relative } from '../Paths/posix'
import { excludedWithin } from '../Settings/settings'
import { stampedId } from '../Files/pageFile'
import type { ContextDef, ContextsRegistry } from '../Contexts/contexts'
import type { Result } from '../Contract/result'
import { liveTreeOf } from '../Nexus/liveTree'
import { containerAt } from '../Nexus/treePatch'
import type { SweepCapture, UnlinkOutcome } from '../Contexts/contextCascade'
import { readTextOrNull } from '../Files/atomicWrite'
import { spaceIdsIn } from '../Contexts/spaceSidecar'
import { sidecarId } from '../Files/sidecar'
import { exactTitle } from '../Paths/caseFold'
import { readPageRelations } from '../Index/contentIndex'
import { valueLinks } from '../Connections/scan'
import { ID_KEY } from '../Nexus/identityMark'
import { pageIndexOf } from '../Nexus/record'
import type { NexusTree } from '../Nexus/tree'

import type { RecordFile, ParentRef } from './record'
import type { ContainerKind } from '../Nexus/entities'

async function gatherParentRef(root: string, absEntity: string): Promise<ParentRef> {
  const parentDir = dirname(absEntity)
  if (parentDir === root) return { kind: 'root' }
  const id = containerAt(await liveTreeOf(root), relative(root, parentDir))?.id
  return id ? { kind: 'container', id } : { kind: 'unaddressable' }
}

/** What each outbound link at or under `rel` named: the id of the page its key resolves to alone, from the rows the index holds for the pages there (`paths`) and the values the Spaces there hold. */
export function gatherLinkTargets(
  tree: NexusTree,
  rel: string,
  paths: string[],
): Record<string, string> {
  const index = pageIndexOf(tree)
  const out = new Map<string, string>()
  const note = (key: string): void => {
    const page = out.has(key) ? undefined : index.resolve(key).page
    if (page) out.set(key, page.id)
  }
  for (const row of readPageRelations(paths, ID_KEY)?.relations ?? []) note(row.target)
  for (const g of tree.contexts)
    for (const s of g.spaces)
      if (isAtOrUnder(s.path, rel)) for (const hit of valueLinks(s.values ?? {})) note(hit.target)
  return Object.fromEntries(out)
}

export async function gatherContentRecord(
  root: string,
  kind: 'page' | ContainerKind,
  abs: string,
): Promise<RecordFile> {
  const parent = await gatherParentRef(root, abs)
  const id =
    kind === 'page' ? stampedId((await readTextOrNull(abs)) ?? '') : await sidecarId(abs, kind)
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
  const id = await sidecarId(abs, 'space')
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
  const { ids, unread: unresolved } = await spaceIdsIn(abs)
  const spaceIds = new Map([...ids].map(([name, id]) => [exactTitle(name), id]))
  return { entry: { ...entry }, at, spaceIds, unresolved }
}

export function buildContextRecord(
  evidence: ContextEvidence,
  swept: UnlinkOutcome | null,
): RecordFile {
  const membership = (swept?.captured ?? []).map((c) => ({
    root: { ...(c.id ? { id: c.id } : {}), kind: c.kind },
    spaces: [
      ...new Map(
        c.values.map((title) => {
          const id = evidence.spaceIds.get(exactTitle(title))
          return [id ?? title, id ? { id, title } : { title }]
        }),
      ).values(),
    ],
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
