import { valueOr } from '../Contract/result'
import { ID_KEY } from '../Nexus/identityMark'
import type { PageFrontmatter, PageMeta } from '../Nexus/schemas'
import type { CollectionNode, NexusTree, PageNode, SetNode, SpaceNode } from '../Nexus/tree'
import { spaceLinksOf } from '../Nexus/treeIndex'
import type { PropertyValue } from '../Properties/propertyValue'
import { contextWorldOf, resolveContextKeys } from '../Contexts/contextResolve'
import { relDirname } from '../Paths/posix'
import { dialer } from '../Platform/dialer'
import type { PageValues } from './pageValues'

export type RowValues = PageValues & Pick<ViewRow, 'picked'>

/** The values a page's pending writes picked, by field id. */
export type Picked = Record<string, PropertyValue>

/** `frontmatter` is REQUIRED: when values aren't loaded yet, the flatten step supplies an identity-only entry so the row still sorts/groups/filters on intrinsic fields. */
export interface ViewRow {
  id: string
  title: string
  icon?: string
  path: string
  parentSetId?: string
  frontmatter: PageFrontmatter
  createdAt: string | null
  modifiedAt: string | null
  contextValues?: Record<string, string[]>
  picked?: Picked
}

interface GroupBase {
  key: string
  items: ViewRow[]
  children?: ResolvedGroup[]
}

export type ResolvedGroup =
  | (GroupBase & { kind: 'set' })
  | (GroupBase & { kind: 'bucket'; value: string })
  | (GroupBase & { kind: 'tail' })

export const isEmptyBand = (group: Pick<GroupBase, 'items' | 'children'>): boolean =>
  group.items.length === 0 && !group.children?.length

/** Stored on disk in `collapsed_groups`, so it round-trips across builds — the single source the pipeline and the render code both match group keys against. */
export const UNGROUPED = '_ungrouped'

export const frontmatterOf = (
  values: Record<string, PageValues>,
  pageId: string,
): PageFrontmatter => values[pageId]?.frontmatter ?? { [ID_KEY]: pageId }

export function toRow(
  page: PageNode,
  parentSetId: string | undefined,
  values: Record<string, RowValues>,
  pageMetadata: Record<string, PageMeta>,
): ViewRow {
  const v = values[page.id]
  return {
    id: page.id,
    title: page.title,
    icon: pageMetadata[page.id]?.icon,
    path: page.path,
    ...(parentSetId !== undefined ? { parentSetId } : {}),
    frontmatter: frontmatterOf(values, page.id),
    createdAt: v?.createdAt ?? null,
    modifiedAt: v?.modifiedAt ?? null,
    ...(page.contextValues !== undefined ? { contextValues: page.contextValues } : {}),
    ...(v?.picked ? { picked: v.picked } : {}),
  }
}

// The setTree is node.sets itself (the real folder walk), so empty Sets still appear as disclosure groups and a Collection and a Set container flow through the identical structural path.
export function flattenContainer(
  node: CollectionNode | SetNode,
  valuesByPageId: Record<string, RowValues>,
  pageMetadata: Record<string, PageMeta>,
): { rows: ViewRow[]; setTree: SetNode[] } {
  const rows: ViewRow[] = []
  const walk = (container: CollectionNode | SetNode, parentSetId: string | undefined): void => {
    for (const p of container.pages) rows.push(toRow(p, parentSetId, valuesByPageId, pageMetadata))
    for (const child of container.sets ?? []) walk(child, child.id)
  }
  walk(node, undefined)
  return { rows, setTree: node.sets ?? [] }
}

export function pageRowOf(
  tree: NexusTree | null,
  page: { id: string; path: string; title: string },
  fm: PageFrontmatter,
  picked?: Picked,
): ViewRow {
  const links = tree ? resolveContextKeys(fm, contextWorldOf(tree.contexts)) : null
  return {
    ...page,
    icon: tree?.config.pageMetadata[page.id]?.icon,
    frontmatter: fm,
    createdAt: null,
    modifiedAt: null,
    ...(links?.size ? { contextValues: Object.fromEntries(links) } : {}),
    ...(picked ? { picked } : {}),
  }
}

// A Space has no ID key on disk; this one exists to satisfy ViewRow and is never written back.
export function spaceRowOf(tree: NexusTree, node: SpaceNode, picked?: Picked): ViewRow {
  const links = spaceLinksOf(tree).get(node.id)
  return {
    id: node.id,
    title: node.title,
    icon: node.icon,
    path: node.path,
    frontmatter: { ...node.values, [ID_KEY]: node.id } as PageFrontmatter,
    createdAt: null,
    modifiedAt: null,
    ...(links ? { contextValues: links } : {}),
    ...(picked ? { picked } : {}),
  }
}

/** A failed batch read keeps the values already held — a blank container reads as data loss. */
export const fetchPageValues = (
  path: string,
  pageIds?: string[],
): Promise<Record<string, PageValues> | null> =>
  dialer()
    .ask('view:loadValues', path, pageIds)
    .then((r) => valueOr(r, null))

export async function fetchPageRow(
  tree: NexusTree | null,
  page: { id: string; path: string; title: string },
): Promise<ViewRow | null> {
  const values = await fetchPageValues(relDirname(page.path), [page.id])
  const found = values?.[page.id]
  return found ? pageRowOf(tree, page, found.frontmatter) : null
}
