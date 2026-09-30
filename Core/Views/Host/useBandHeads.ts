import { useMemo } from 'react'
import type { CollectionNode, SetNode } from '../../Nexus/tree'
import type { PropertyDefinition } from '../../Properties/properties'
import type { SavedView, SubGroupConfig } from '../views'
import { headContextOf } from '../Bands/bandModel'
import { setIndexOf } from '../Pipeline/setIndex'
import { usePainted } from './pendingView'
import { styleFor, useNexusForms } from './useColumnStyles'

export function useBandHeads(
  source: CollectionNode | SetNode,
  grouping: SubGroupConfig | undefined,
  schema: PropertyDefinition[],
  view: SavedView,
) {
  const painted = usePainted(source)
  const sets = setIndexOf(painted)
  const nexus = useNexusForms()
  const heads = useMemo(
    () =>
      headContextOf(painted, sets, grouping, schema, view, (id) =>
        styleFor(id, schema, view, nexus),
      ),
    [painted, sets, grouping, schema, view, nexus],
  )
  return { painted, sets, nexus, heads }
}
