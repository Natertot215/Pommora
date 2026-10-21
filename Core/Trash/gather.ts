import { basename, dirname, isAtOrUnder, join } from '../Paths/posix'
import type { ContextDef, ContextsRegistry } from '../Contexts/contexts'
import type { Result } from '../Contract/result'
import type { SweepCapture, UnlinkOutcome } from '../Contexts/contextCascade'
import { readTextOrNull } from '../Files/atomicWrite'
import { spaceIdsIn } from '../Contexts/spaceSidecar'
import { sidecarIdentity } from '../Files/sidecar'
import { exactTitle } from '../Paths/caseFold'
import { readPageRelations } from '../Index/contentIndex'
import { extractPageIndex } from '../Index/indexSeed'
import { valueLinks } from '../Connections/scan'
import { ID_KEY } from '../Nexus/identityMark'
import { pageIndexOf } from '../Nexus/record'
import { nexusPages } from '../Nexus/heldPages'
import { buildPageIndex } from '../Connections/pageIndex'
import type { NexusTree } from '../Nexus/tree'
import type { Relation } from '../Platform/stores'
import { contextWorldOf } from '../Contexts/contextResolve'
import { placeOf, type RecordFile } from '../Bundles/record'

/** The page-to-page rows of the pages at `paths`: the index's, or read from their files by the index's own extractor while it has none to answer with. */
async function pageRelationsOf(root: string, paths: readonly string[]): Promise<Relation[]> {
  const indexed = readPageRelations(paths, ID_KEY)
  if (indexed) return indexed.relations
  const texts = await Promise.all(paths.map((p) => readTextOrNull(join(root, p))))
  return texts.flatMap((text) =>
    text === null ? [] : extractPageIndex(text).relations.filter((r) => r.kind !== 'space'),
  )
}

/** What each outbound link at or under `rel` named: the id and path of the page its key resolves to alone, from the rows of the pages there (`paths`) and the values the Spaces there hold; a key no live page answers names the archived page that answers it. */
export async function gatherLinkTargets(
  root: string,
  tree: NexusTree,
  rel: string,
  paths: readonly string[],
): Promise<Record<string, { id: string; path: string }>> {
  const live = pageIndexOf(tree)
  const archived = buildPageIndex((await nexusPages(root, tree)).archived)
  const out = new Map<string, { id: string; path: string }>()
  const note = (key: string): void => {
    const hit = live.resolve(key)
    const page = out.has(key)
      ? undefined
      : hit.status === 'phantom'
        ? archived.resolve(key).page
        : hit.page
    if (page) out.set(key, { id: page.id, path: page.path })
  }
  for (const row of await pageRelationsOf(root, paths)) note(row.target)
  for (const g of tree.contexts)
    for (const s of g.spaces)
      if (isAtOrUnder(s.path, rel)) for (const hit of valueLinks(s.values ?? {})) note(hit.target)
  return Object.fromEntries(out)
}

const sweepIncomplete = (swept: UnlinkOutcome | null): boolean =>
  swept === null || swept.skipped.length > 0 || swept.refused.length > 0

export async function gatherSpaceRecord(
  tree: NexusTree,
  abs: string,
  registry: Result<ContextsRegistry> | null,
  swept: UnlinkOutcome | null,
): Promise<RecordFile | null> {
  const { id, icon } = await sidecarIdentity(abs, 'space')
  if (!id) return null
  const contextTitle = basename(dirname(abs))
  const def = registry?.ok
    ? registry.value.contexts.find((c) => c.title === contextTitle)
    : undefined
  const group = def && contextWorldOf(tree.contexts).groupById.get(def.id)
  const place =
    group &&
    placeOf(
      group.spaces.map((s) => s.id),
      id,
    )
  const captured = swept?.captured ?? []
  const members = captured
    .filter((c): c is SweepCapture & { id: string } => typeof c.id === 'string')
    .map((c) => ({ id: c.id, kind: c.kind }))
  const partial = sweepIncomplete(swept) || members.length < captured.length
  return {
    entity: 'space',
    id,
    ...(icon ? { icon } : {}),
    parent: def ? { kind: 'context', id: def.id } : { kind: 'unaddressable' },
    ...(place ? { place } : {}),
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
