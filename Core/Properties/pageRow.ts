import { valueOr } from '@pommora/core/Contract/result'
import type { PageFrontmatter } from '@pommora/core/Nexus/schemas'
import type { NexusTree } from '@pommora/core/Nexus/tree'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import type { PageValues, ViewRow } from '@pommora/core/Views/viewRow'
import { resolveTreeContextKeys } from '@pommora/core/Contexts/contextResolve'
import { relDirname } from '@pommora/core/Paths/posix'
import { host } from '../Platform/dialer'

export const schemaForPage = (tree: NexusTree | null, path: string): PropertyDefinition[] =>
  tree?.collections.find((c) => path.startsWith(`${c.path}/`))?.properties ?? []

export function pageRowOf(
  tree: NexusTree | null,
  page: { id: string; path: string; title: string },
  fm: PageFrontmatter,
): ViewRow {
  const links = tree?.contexts ? resolveTreeContextKeys(tree, fm as Record<string, unknown>) : null
  const rider = fm.contextValues as Record<string, string[]> | undefined
  return {
    ...page,
    icon: fm.icon,
    frontmatter: fm,
    createdAt: null,
    modifiedAt: null,
    ...(links && (links.size || rider)
      ? { contextValues: { ...Object.fromEntries(links), ...rider } }
      : {}),
  }
}

/** A failed batch read keeps the values already held — a blank container reads as data loss. */
export const fetchPageValues = (
  path: string,
  pageIds?: string[],
): Promise<Record<string, PageValues> | null> =>
  host()
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
