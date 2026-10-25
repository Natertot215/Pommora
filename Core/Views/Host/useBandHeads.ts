import { useMemo } from 'react'
import type { CollectionNode, SetNode } from '../../Nexus/tree'
import type { PropertyDefinition } from '../../Properties/properties'
import type { SavedView } from '../views'
import { headContextOf } from '../Bands/bandModel'
import type { Grouping } from '../Pipeline/group'
import { setIndexOf } from '../Pipeline/setIndex'
import { usePainted } from './pendingView'
import { styleFor, useNexusForms } from './useColumnStyles'
import { useSetting } from '../../Session/store'

export function useBandHeads(
  source: CollectionNode | SetNode,
  grouping: Grouping | undefined,
  schema: PropertyDefinition[],
  view: SavedView,
) {
  const painted = usePainted(source)
  const sets = setIndexOf(painted)
  const nexus = useNexusForms()
  const foldersOpen = useSetting('openFoldersOnTitleClick')
  const heads = useMemo(
    () =>
      headContextOf(
        painted,
        sets,
        grouping,
        view,
        (id) => styleFor(id, schema, view, nexus),
        foldersOpen,
      ),
    [painted, sets, grouping, schema, view, nexus, foldersOpen],
  )
  return { painted, sets, nexus, heads }
}
