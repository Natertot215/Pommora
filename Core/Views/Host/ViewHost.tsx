import { ZOOM } from '../../Settings/personalization'
import type { CollectionNode, SetNode } from '../../Nexus/tree'
import { useViewTileScope } from '../ViewTileScope'
import { useActiveView } from './useActiveView'
import { useViewHost } from './useViewHost'
import { presentedKind } from './viewKinds'
import { usePublishCount } from '../../Interface/Subfield/publish'

export function ViewHost({ source }: { source: CollectionNode | SetNode }): React.JSX.Element {
  // Only the type and scale are needed to seat a renderer.
  const view = useActiveView(source)
  const { Renderer, nests } = presentedKind(view.type)
  const tile = useViewTileScope()
  // An embedded tile states its own size, so in a tile scope the factor stays 1 and never compounds with the embed zoom.
  const scale = tile ? ZOOM.default : (view.view_scale ?? ZOOM.default)
  const host = useViewHost(source, nests)
  // The resolved rows are already post-filter, so their total is the count; an embedded tile leaves the bar to the surface that owns it.
  usePublishCount(!tile && host ? host.rowById.size : null)
  if (!host) return <div />
  return (
    <div style={scale === 1 ? undefined : { zoom: scale }}>
      <Renderer host={host} />
    </div>
  )
}
