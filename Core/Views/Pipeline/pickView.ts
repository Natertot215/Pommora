import type { CollectionNode, SetNode } from '../../Nexus/tree'
import { DEFAULT_VIEW_ID, mintDefaultView, type SavedView } from '../views'

const DEFAULT_VIEW: SavedView = { ...mintDefaultView(), id: DEFAULT_VIEW_ID }

/** The container's chosen view if still present, else the first saved view, else the one default view (sentinel id until first saved). */
export function pickView(source: CollectionNode | SetNode): SavedView {
  const views = source.views ?? []
  const saved =
    (source.activeView ? views.find((v) => v.id === source.activeView) : undefined) ?? views[0]
  return saved ?? DEFAULT_VIEW
}
