import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import type { CollectionNode, SetNode } from '@pommora/core/Nexus/tree'
import { DEFAULT_VIEW_ID, mintDefaultView, type SavedView } from '@pommora/core/Views/views'

const minted = new WeakMap<PropertyDefinition[], SavedView>()

/** The container's chosen view if still present, else the first saved view, else the default minted once per schema (sentinel id until first saved). */
export function pickView(
  source: CollectionNode | SetNode,
  schema: PropertyDefinition[],
): SavedView {
  const views = source.views ?? []
  const saved =
    (source.activeView ? views.find((v) => v.id === source.activeView) : undefined) ?? views[0]
  if (saved) return saved
  const view = minted.get(schema) ?? { ...mintDefaultView(schema), id: DEFAULT_VIEW_ID }
  minted.set(schema, view)
  return view
}
