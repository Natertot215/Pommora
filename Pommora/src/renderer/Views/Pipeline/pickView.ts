// The two container-level resolvers every view surface reads before it renders anything — which
// schema governs this container, and which of its saved views is showing. Pure, and deliberately
// outside any renderer: both are read by Cards, by the Visibility pane, and by the view router.

import type { PropertyDefinition } from '@shared/properties'
import type { CollectionNode, NexusTree, SetNode } from '@shared/types'
import { mintDefaultView, type SavedView } from '@shared/views'

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
