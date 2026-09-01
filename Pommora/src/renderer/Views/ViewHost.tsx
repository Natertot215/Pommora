import { useRef } from 'react'
import type { PropertyDefinition } from '@shared/properties'
import { coerceScale, type CollectionNode, type SetNode } from '@shared/types'
import { useViewTileScope } from '@renderer/SurfacePM/ViewTileScope'
import type { SavedView } from '@shared/views'
import { useActiveView } from './useActiveView'
import { TableView } from './TableView/TableView'
import { CardsView } from './CardView/CardsView'
import { useViewHost, type ViewHostApi } from './useViewHost'
import './view-host.css'

const identity = (v: SavedView): SavedView => v
const NO_SCHEMA: PropertyDefinition[] = []

export function ViewHost({ source }: { source: CollectionNode | SetNode }): React.JSX.Element {
  // Only the type and scale are needed to seat a renderer, and a minted default is a table
  // whatever the schema — so the seat skips the schema walk the host itself performs.
  const view = useActiveView(source, NO_SCHEMA).view
  const isCards = view.type === 'cards'
  // The view's own scale is a main-pane read: an embedded tile states its own size, so in a tile
  // scope the factor stays 1 and never compounds with the embed zoom.
  const scale = useViewTileScope() ? 1 : coerceScale(view.view_scale ?? 1, 1)
  const upward = useRef<ViewHostApi['seam']>({
    foldOverrides: { current: identity },
    bandBucket: { current: (key) => key },
    viewRootRef: { current: null },
    onCreated: { current: () => {} },
  }).current
  const host = useViewHost(source, isCards, upward)
  // Cards' set cards render independently of the pipeline, so a cards view with Sets present
  // always mounts — Set Cards on paints them, off stays a blank pane.
  const setChrome = isCards && (source.sets?.length ?? 0) > 0
  if (!host) return <div className="view-empty">Loading…</div>
  if (host.groups.length === 0 && !setChrome) return <div className="view-empty">No pages here</div>
  return (
    <div style={scale === 1 ? undefined : { zoom: scale }}>
      {isCards ? <CardsView host={host} /> : <TableView host={host} />}
    </div>
  )
}
