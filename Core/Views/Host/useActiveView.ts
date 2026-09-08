import type { CollectionNode, SetNode } from '@pommora/core/Nexus/tree'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import type { SavedView } from '@pommora/core/Views/views'
import { useViewTileScope } from '../ViewTileScope'
import { pickView } from '../Pipeline/pickView'

export function useActiveView(
  source: CollectionNode | SetNode,
  schema: PropertyDefinition[],
): SavedView {
  // Inside a view embed the tile payload IS the view; the container's own choice doesn't reach it.
  const scope = useViewTileScope()
  return scope ? scope.view : pickView(source, schema)
}
