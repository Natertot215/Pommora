import { ZOOM } from '@pommora/core/Settings/personalization'
import type { CollectionNode, SetNode } from '@pommora/core/Nexus/tree'
import { useViewTileScope } from '../ViewTileScope'
import { VIEW_KINDS, type ViewType } from '@pommora/core/Views/views'
import { useActiveView } from './useActiveView'
import { NO_SCHEMA } from '../Pipeline/pickView'
import { TableView } from '../Table/TableView'
import { CardsView } from '../Cards/CardsView'
import { useViewHost, type ViewHostApi } from './useViewHost'
import { usePublishCount } from '../../Interface/Subfield/publish'

const VIEW_RENDERERS: Partial<Record<ViewType, (p: { host: ViewHostApi }) => React.JSX.Element>> = {
  table: TableView,
  cards: CardsView,
}

export function ViewHost({ source }: { source: CollectionNode | SetNode }): React.JSX.Element {
  // Only the type and scale are needed to seat a renderer, and a minted default is a table whatever the schema — so the seat skips the schema walk the host performs.
  const view = useActiveView(source, NO_SCHEMA)
  const Renderer = VIEW_RENDERERS[view.type] ?? TableView
  const tile = useViewTileScope()
  // An embedded tile states its own size, so in a tile scope the factor stays 1 and never compounds with the embed zoom.
  const scale = tile ? ZOOM.default : (view.view_scale ?? ZOOM.default)
  const host = useViewHost(source, VIEW_KINDS[view.type].flat)
  // The resolved rows are already post-filter, so their total is the count; an embedded tile leaves the bar to the surface that owns it.
  usePublishCount(!tile && host ? host.rowById.size : null)
  if (!host) return <div />
  return (
    <div style={scale === 1 ? undefined : { zoom: scale }}>
      <Renderer host={host} />
    </div>
  )
}
