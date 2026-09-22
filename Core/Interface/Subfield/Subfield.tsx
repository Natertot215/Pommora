import { text } from '@pommora/uix/Theme'
import { cx } from '@pommora/uix/Utilities/cx'
import type { SelectionState } from '@pommora/core/Navigation/navRef'
import { BoardLock } from '../../Tiles/BoardLock'
import { useSession } from '../../Session/store'
import { subfieldCrumbs } from './crumbs'
import { NavTrail } from '@pommora/uix/Elements/NavTrail'
import { overScrollEllipsis } from '@pommora/uix/Interactions/OverScroll'
import { DEFAULT_ITEMS, SubfieldItem, type SubfieldPage } from './subfieldItems'
import './subfield.css'

export function Subfield({
  page,
  count = null,
  lead,
  selection: override,
  inert = false,
}: {
  page: SubfieldPage | null
  /** How many rows the surface resolved — what the counter states where a kind asks for one. */
  count?: number | null
  /** Stands where the breadcrumb would for a surface with no spine to draw. */
  lead?: React.ReactNode
  /** A floating window's bar describes its own contents rather than the main pane's selection. */
  selection?: SelectionState
  /** A floating window's crumbs describe location without driving the main pane — no dimmed tail, nothing to click. */
  inert?: boolean
}): React.JSX.Element {
  const selection = useSession((s) => s.selection)
  const tree = useSession((s) => s.tree)
  const navigateCrumb = useSession((s) => s.navigateCrumb)
  const crumbDepth = useSession((s) => s.crumbDepth)

  const crumbSelection = override ?? page?.target ?? selection
  const rawCrumbs = subfieldCrumbs(tree, crumbSelection, inert ? null : crumbDepth, navigateCrumb)
  const crumbs = inert ? rawCrumbs.map((c) => ({ ...c, onSelect: undefined })) : rawCrumbs
  const items = DEFAULT_ITEMS[crumbSelection.kind] ?? []

  return (
    <div className={`subfield ${text.subline.emphasized}`}>
      {lead ?? (
        <NavTrail
          segments={crumbs}
          chevronSize="control"
          overScroll={false}
          className="subfield-crumbs"
          segmentClassName={cx('subfield-crumb', overScrollEllipsis)}
        />
      )}
      <div className="subfield-items">
        {items.map((id) => (
          <SubfieldItem key={id} id={id} page={page} count={count} />
        ))}
        {inert && crumbSelection.kind === 'space' && (
          <BoardLock host={{ kind: 'space', id: crumbSelection.id }} />
        )}
      </div>
    </div>
  )
}
