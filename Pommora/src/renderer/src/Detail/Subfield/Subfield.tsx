import type { SelectionState } from '@shared/types'
import { text } from '@renderer/DesignSystem/Tokens'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { useSession } from '../../store'
import { subfieldCrumbs } from './crumbs'
import { NavTrail } from '@renderer/DesignSystem/Elements/NavTrail'
import { overScrollEllipsis } from '@renderer/DesignSystem/Interactions/OverScroll'
import { DEFAULT_ITEMS, SubfieldItem, type SubfieldScope, isSubfieldItemId } from './subfieldItems'
import './subfield.css'

export function Subfield({ scope }: { scope?: SubfieldScope }): React.JSX.Element {
  const selection = useSession((s) => s.selection)
  const tree = useSession((s) => s.tree)
  const navigateCrumb = useSession((s) => s.navigateCrumb)
  const crumbDepth = useSession((s) => s.crumbDepth)

  const order = useSession((s) => s.subfieldOrder)
  const crumbSelection: SelectionState = scope
    ? { kind: 'page', id: scope.target.id, path: scope.target.path }
    : selection
  // The preview is tab-neutral — no dimmed tail, and its crumbs describe location without driving the
  // main pane. Elsewhere the depth extends the path to the deepest node visited on it.
  const rawCrumbs = subfieldCrumbs(tree, crumbSelection, scope ? null : crumbDepth, navigateCrumb)
  const crumbs = scope ? rawCrumbs.map((c) => ({ ...c, onSelect: undefined })) : rawCrumbs
  const kind = crumbSelection.kind
  const items = (order[kind] ?? DEFAULT_ITEMS[kind] ?? []).filter(isSubfieldItemId)

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
          <SubfieldItem key={id} id={id} scope={scope} />
        ))}
      </div>
    </div>
  )
}
