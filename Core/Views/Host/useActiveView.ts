import type { CollectionNode, SetNode } from '../../Nexus/tree'
import type { PropertyDefinition } from '../../Properties/properties'
import type { SavedView } from '../views'
import { useViewTileScope } from '../ViewTileScope'
import { pickView } from '../Pipeline/pickView'
import { useLiveView } from './pendingView'

export function useActiveView(
  source: CollectionNode | SetNode,
  schema: PropertyDefinition[],
): SavedView {
  // Inside a view embed the tile payload IS the view; the container's own choice doesn't reach it.
  const scope = useViewTileScope()
  return useLiveView(source.id, scope ? scope.view : pickView(source, schema))
}
