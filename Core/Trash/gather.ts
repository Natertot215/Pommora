import { isAtOrUnder, isMarkdownFile, join } from '../Paths/posix'
import type { ContextDef } from '../Contexts/contexts'
import type { Holders } from '../Index/keyHolders'
import type { Json } from '../Files/stableJson'
import { scalarMembers } from '../Contract/validators'
import { contextKey } from '../Contexts/contexts'
import { readTextOrNull } from '../Files/atomicWrite'
import { contextDirRel } from '../Paths/nexusPaths'
import { exactTitle } from '../Paths/caseFold'
import { readPageRelations } from '../Index/contentIndex'
import { extractPageIndex } from '../Index/indexSeed'
import { valueLinks } from '../Connections/scan'
import { ID_KEY } from '../Nexus/identityMark'
import { pageIndexOf } from '../Nexus/record'
import { nexusPages } from '../Nexus/heldPages'
import { buildPageIndex } from '../Connections/pageIndex'
import type { NexusTree, SpaceNode } from '../Nexus/tree'
import { asStringArray } from '../Nexus/coerce'
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

/** Each holder the capture filed by id, as a record names it, a page with the key its line stood above. */
const rootsOf = (
  holders: Holders,
): [{ id: string; kind: 'page' | 'space'; above?: string }, Json][] =>
  holders.held.flatMap((h) => {
    const kind = isMarkdownFile(h.file) ? 'page' : 'space'
    return h.id && h.values ? [[{ id: h.id, kind, above: h.above[h.keys[0]] }, h.values]] : []
  })

/** A capture missing a holder: one neither its file nor the index could answer, or one no id files. */
const partly = (holders: Holders): boolean => holders.held.some((h) => !h.id || !h.values)

export function gatherSpaceRecord(tree: NexusTree, space: SpaceNode, held: Holders): RecordFile {
  const group = contextWorldOf(tree.contexts).groupById.get(space.contextId)!
  const place = placeOf(
    group.spaces.map((s) => s.id),
    space.id,
  )
  return {
    entity: 'space',
    id: space.id,
    ...(space.icon ? { icon: space.icon } : {}),
    parent: { kind: 'context', id: space.contextId },
    ...(place ? { place } : {}),
    members: rootsOf(held).map(([member]) => member),
    ...(partly(held) ? { partial: true as const } : {}),
  }
}

export function gatherContextRecord(tree: NexusTree, entry: ContextDef, held: Holders): RecordFile {
  const group = contextWorldOf(tree.contexts).groupById.get(entry.id)!
  const spaceIds = new Map(group.spaces.map((s) => [exactTitle(s.title), s.id]))
  const under = `${contextDirRel(entry.title)}/`
  const unread = tree.unreadable?.some((u) => u.kind === 'space' && u.path.startsWith(under))
  const key = contextKey(entry.title)
  const membership = rootsOf(held).map(([member, values]) => ({
    root: member,
    spaces: [
      ...new Map(
        scalarMembers(values[key]).map((title) => {
          const id = spaceIds.get(exactTitle(title))
          return [id ?? title, id ? { id, title } : { title }]
        }),
      ).values(),
    ],
  }))
  const place = placeOf(
    tree.contexts.map((g) => g.def.id),
    entry.id,
  )
  const panel = placeOf(tree.config.order.contexts ?? [], entry.id)
  const spaceOrder = asStringArray(tree.config.order.spaces[entry.id])
  return {
    entity: 'context',
    registry: entry,
    ...(place ? { place } : {}),
    ...(panel ? { panel } : {}),
    ...(spaceOrder?.length ? { spaceOrder } : {}),
    membership,
    ...(unread || partly(held) ? { partial: true as const } : {}),
  }
}
