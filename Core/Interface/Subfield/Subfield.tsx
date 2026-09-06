import { text } from '@pommora/uix/Theme'
import { cx } from '@pommora/uix/Utilities/cx'
import { useSession } from '../../Session/store'
import { subfieldCrumbs } from './crumbs'
import { NavTrail } from '@pommora/uix/Elements/NavTrail'
import { overScrollEllipsis } from '@pommora/uix/Elements/OverScroll'
import { DEFAULT_ITEMS, SubfieldItem, type SubfieldPage } from './subfieldItems'
import './subfield.css'

export function Subfield({
  page,
  inert = false,
}: {
  page: SubfieldPage | null
  /** A floating window's crumbs describe location without driving the main pane — no dimmed
   *  tail, nothing to click. The pane's extend the path to the deepest node visited on it. */
  inert?: boolean
}): React.JSX.Element {
  const selection = useSession((s) => s.selection)
  const tree = useSession((s) => s.tree)
  const navigateCrumb = useSession((s) => s.navigateCrumb)
  const crumbDepth = useSession((s) => s.crumbDepth)

  const crumbSelection = page?.target ?? selection
  const rawCrumbs = subfieldCrumbs(tree, crumbSelection, inert ? null : crumbDepth, navigateCrumb)
  const crumbs = inert ? rawCrumbs.map((c) => ({ ...c, onSelect: undefined })) : rawCrumbs
  const items = DEFAULT_ITEMS[crumbSelection.kind] ?? []

  return (
    // With no breadcrumb (NavView) the action has nothing to sit opposite, so it leads on the left
    // instead of being pushed to the far edge.
    <div
      className={`subfield ${text.subline.emphasized}${crumbs.length === 0 ? ' subfield-lead' : ''}`}
    >
      <NavTrail
        segments={crumbs}
        chevronSize="control"
        overScroll={false}
        className="subfield-crumbs"
        segmentClassName={cx('subfield-crumb', overScrollEllipsis)}
      />
      <div className="subfield-items">
        {items.map((id) => (
          <SubfieldItem key={id} id={id} page={page} />
        ))}
      </div>
    </div>
  )
}
