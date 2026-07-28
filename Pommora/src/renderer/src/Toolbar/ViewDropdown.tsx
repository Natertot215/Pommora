import { useRef, useState } from 'react'
import type { CollectionNode, SetNode } from '@shared/types'
import {
  SegmentedButton,
  type Segment,
} from '@renderer/design-system/components/Segmented-Controls'
import { useDismiss } from '@renderer/design-system/components/useDismiss'
import { MenuSurface } from '@renderer/design-system/components/menu'
import { iconNameOr } from '@renderer/design-system/symbols'
import { useExitPresence } from '@renderer/design-system/useExitPresence'
import { useSession } from '../store'
import { findCollection, findSet, findCollectionForSet, isDepth1Set } from '../Detail/Scope'
import { useActiveView } from '../Detail/Views/useActiveView'
import { ViewPane } from './ViewPane'
import * as s from './viewDropdown.css'

/** Renders only on a Collection / depth-1 Set (sub-Sets don't own saved views). The `view_style`
 *  branch is a seam — Toolbar mode reuses this dropdown button until ViewBar lands. */
export function ViewDropdown(): React.JSX.Element | null {
  const selection = useSession((st) => st.selection)
  const tree = useSession((st) => st.tree)
  const node =
    selection.kind === 'collection'
      ? findCollection(tree, selection.id)
      : selection.kind === 'set' && isDepth1Set(tree, selection.id)
        ? findSet(tree, selection.id)
        : undefined
  if (!node) return null
  return <ViewDropdownInner key={node.id} node={node} />
}

function ViewDropdownInner({ node }: { node: CollectionNode | SetNode }): React.JSX.Element {
  const tree = useSession((st) => st.tree)
  const load = useSession((st) => st.load)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  useDismiss(wrapRef, () => setOpen(false), open)
  const paneP = useExitPresence(open)
  const labeled = (node.viewButton ?? 'icon') === 'labeled'

  const schema =
    node.kind === 'collection'
      ? (node.properties ?? [])
      : (findCollectionForSet(tree, node.id)?.properties ?? [])
  const { view } = useActiveView(node, schema)

  const onContextMenu = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    const action = await window.nexus.viewButtonMenu({
      viewButton: node.viewButton ?? 'icon',
      viewStyle: node.viewStyle ?? 'dropdown',
    })
    if (!action) return
    const patch =
      action === 'toggle-title'
        ? { view_button: labeled ? ('icon' as const) : ('labeled' as const) }
        : action === 'style-dropdown'
          ? { view_style: 'dropdown' as const }
          : { view_style: 'toolbar' as const }
    await window.nexus.container.configure(node.path, node.kind, patch)
    await load()
  }

  const segment: Segment = {
    icon: iconNameOr(view.icon, 'table'),
    title: 'Views',
    active: open,
    onClick: () => setOpen((o) => !o),
  }

  return (
    <div ref={wrapRef} className={s.wrapper}>
      {/* display:contents — a right-click on the open pane (a sibling below) must never reach this menu. */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics */}
      <span className={s.buttonSlot} onContextMenu={(e) => void onContextMenu(e)}>
        <SegmentedButton
          segments={[{ ...segment, label: view.name }]}
          className={s.button}
          labelCollapsed={!labeled}
        />
      </span>
      {paneP.mounted && (
        <div className={s.anchor}>
          <MenuSurface closing={paneP.closing}>
            <ViewPane node={node} schema={schema} onClose={() => setOpen(false)} />
          </MenuSurface>
        </div>
      )}
    </div>
  )
}
