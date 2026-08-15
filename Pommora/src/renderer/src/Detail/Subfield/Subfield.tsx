import type { SelectionState } from '@shared/types'
import { text } from '@renderer/design-system/tokens'
import { useSession } from '../../store'
import { subfieldCrumbs } from './crumbs'
import { SubfieldBreadcrumb } from './SubfieldBreadcrumb'
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
  const rawCrumbs = subfieldCrumbs(tree, crumbSelection, scope ? null : crumbDepth, (t, dir) =>
    navigateCrumb(t, dir),
  )
  const crumbs = scope ? rawCrumbs.map((c) => ({ ...c, onClick: undefined })) : rawCrumbs
  const kind = crumbSelection.kind
  const items = (order[kind] ?? DEFAULT_ITEMS[kind] ?? []).filter(isSubfieldItemId)

  return (
    // With no breadcrumb (NavView) the action has nothing to sit opposite, so it leads on the left
    // instead of being pushed to the far edge.
    <div
      className={`subfield ${text.subline.emphasized}${crumbs.length === 0 ? ' subfield-lead' : ''}`}
    >
      <SubfieldBreadcrumb crumbs={crumbs} />
      <div className="subfield-items">
        {items.map((id) => (
          <SubfieldItem key={id} id={id} scope={scope} />
        ))}
      </div>
    </div>
  )
}
