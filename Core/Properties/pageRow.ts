import { valueOr } from '../Contract/result'
import type { PageFrontmatter } from '../Nexus/schemas'
import type { NexusTree, SpaceNode } from '../Nexus/tree'
import { ID_KEY } from '../Nexus/identityMark'
import { spaceLinksOf } from '../Nexus/treeIndex'
import type { PageValues, ViewRow } from '../Views/viewRow'
import { resolveTreeContextKeys } from '../Contexts/contextResolve'
import { relDirname } from '../Paths/posix'
import { dialer } from '../Platform/dialer'

export function pageRowOf(
  tree: NexusTree | null,
  page: { id: string; path: string; title: string },
  fm: PageFrontmatter,
  contexts?: Record<string, string[]>,
): ViewRow {
  const links = tree?.contexts ? resolveTreeContextKeys(tree, fm as Record<string, unknown>) : null
  return {
    ...page,
    icon: tree?.config.pageMetadata[page.id]?.icon,
    frontmatter: fm,
    createdAt: null,
    modifiedAt: null,
    ...(links && (links.size || contexts)
      ? { contextValues: { ...Object.fromEntries(links), ...contexts } }
      : {}),
  }
}

// A Space has no ID key on disk; this one exists to satisfy ViewRow and is never written back.
export function spaceRowOf(
  tree: NexusTree,
  node: SpaceNode,
  fm?: PageFrontmatter,
  contexts?: Record<string, string[]>,
): ViewRow {
  const frontmatter = fm ?? ({ ...node.values, [ID_KEY]: node.id } as PageFrontmatter)
  const links = spaceLinksOf(tree).get(node.id)
  return {
    id: node.id,
    title: node.title,
    icon: node.icon,
    path: node.path,
    frontmatter,
    createdAt: null,
    modifiedAt: null,
    ...(links || contexts ? { contextValues: { ...links, ...contexts } } : {}),
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
