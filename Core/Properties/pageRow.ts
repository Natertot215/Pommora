import type { PageFrontmatter } from '@pommora/core/Nexus/schemas'
import type { NexusTree } from '@pommora/core/Nexus/tree'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import type { ViewRow } from '@pommora/core/Views/viewRow'
import { resolveTreeContextKeys } from '@pommora/core/Contexts/contextResolve'

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
