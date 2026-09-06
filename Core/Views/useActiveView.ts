import type { CollectionNode, SetNode } from '@pommora/core/Nexus/tree'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import type { SavedView } from '@pommora/core/Views/views'
import { useSession } from '../Session/store'
import { useViewTileScope } from './ViewTileScope'
import { pickView } from './Pipeline/pickView'

export function useActiveView(
  source: CollectionNode | SetNode,
  schema: PropertyDefinition[],
): { activeViewId: string | undefined; view: SavedView } {
  // Inside a view embed the tile payload IS the view; the slot read stays unconditional to keep hook order stable.
  const scope = useViewTileScope()
  const activeViewId = useSession((s) => s.activeViews[source.id])
  if (scope) return { activeViewId: scope.view.id, view: scope.view }
  return { activeViewId, view: pickView(source, activeViewId, schema) }
}
