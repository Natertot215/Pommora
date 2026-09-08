import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import type { CollectionNode, NexusTree, SetNode } from '@pommora/core/Nexus/tree'
import { mintDefaultView, type SavedView } from '@pommora/core/Views/views'

/** A Set inherits its ancestor Collection's schema (schema lives only on the Collection); [] when that Collection can't be found. */
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

/** The container's chosen view if still present, else the first saved view, else a freshly-minted default (sentinel id until first saved). */
export function pickView(
  source: CollectionNode | SetNode,
  schema: PropertyDefinition[],
): SavedView {
  const views = source.views ?? []
  const active = source.activeView ? views.find((v) => v.id === source.activeView) : undefined
  return active ?? views[0] ?? mintDefaultView(schema)
}
