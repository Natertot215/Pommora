import type { CollectionNode, SetNode } from '@shared/types'
import { MenuDropdown } from '@renderer/design-system/components/menu'
import { iconNameOr } from '@renderer/design-system/symbols'
import { useSession } from '../store'
import { findCollection, findSet, findCollectionForSet, isDepth1Set } from '../Detail/Scope'
import { useActiveView } from '../Detail/Views/useActiveView'
import { ViewPane } from './ViewPane'
import * as s from './toolbarDropdown.css'

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

  return (
    <MenuDropdown
      icon={iconNameOr(view.icon, 'table')}
      title="Views"
      label={view.name}
      labelCollapsed={!labeled}
      onContextMenu={(e) => void onContextMenu(e)}
      classNames={{ ...s.chrome, buttonSlot: s.buttonSlot }}
    >
      {({ close }) => <ViewPane node={node} schema={schema} onClose={close} />}
    </MenuDropdown>
  )
}
