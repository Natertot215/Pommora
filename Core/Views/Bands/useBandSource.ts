import { useMemo } from 'react'
import type { CollectionNode, SetNode } from '../../Nexus/tree'
import type { SavedView } from '../views'
import { headContextOf } from './bandModel'
import type { Grouping } from '../Pipeline/group'
import { setIndexOf } from './setIndex'
import { usePainted } from '../Host/paintAhead'
import { styleFor } from '../../Properties/columnStyles'
import { useDateForms, useSetting } from '../../Session/store'

export function useBandSource(
  source: CollectionNode | SetNode,
  grouping: Grouping | undefined,
  view: SavedView,
) {
  const painted = usePainted(source)
  const sets = setIndexOf(painted)
  const forms = useDateForms()
  const foldersOpen = useSetting('openFoldersOnTitleClick')
  const heads = useMemo(
    () =>
      headContextOf(
        sets,
        grouping,
        view,
        grouping && styleFor(grouping.column, view, forms).date_format,
        foldersOpen,
      ),
    [sets, grouping, view, forms, foldersOpen],
  )
  return { painted, sets, heads }
}
