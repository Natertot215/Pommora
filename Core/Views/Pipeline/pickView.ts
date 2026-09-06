import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import type { CollectionNode, NexusTree, SetNode } from '@pommora/core/Nexus/tree'
import { mintDefaultView, type SavedView } from '@pommora/core/Views/views'

/** A Collection uses its own schema; a Set inherits its ancestor Collection's (schema lives only on
 *  the Collection). [] when the owning Collection can't be found. */
export function resolveContainerSchema(
  tree: NexusTree,
  source: CollectionNode | SetNode,
): PropertyDefinition[] {
  if (source.kind === 'collection') return source.properties ?? []
  const collections = tree.collections
  const owns = (sets: SetNode[] | undefined): boolean =>
    (sets ?? []).some((s) => s.id === source.id || owns(s.sets))
  return collections.find((c) => owns(c.sets))?.properties ?? []
}

/** The view to render: the per-machine active view if still present, else the first saved view, else
 *  a freshly-minted default (sentinel id until first saved). */
export function pickView(
  source: CollectionNode | SetNode,
  activeId: string | undefined,
  schema: PropertyDefinition[],
): SavedView {
  const views = source.views ?? []
  const active = activeId ? views.find((v) => v.id === activeId) : undefined
  return active ?? views[0] ?? mintDefaultView(schema)
}
