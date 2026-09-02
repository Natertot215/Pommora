import type { CollectionNode, SetNode } from '@shared/types'
import { MenuDropdown } from '@renderer/DesignSystem/Menus'
import { iconNameOr } from '@renderer/DesignSystem/Symbols'
import { useSession } from '../store'
import { findCollection, findSet, findCollectionForSet, isDepth1Set } from '../Interface/scope'
import { useActiveView } from '@renderer/Views/useActiveView'
import { ViewFrame } from './ViewFrame'
import * as s from './toolbar-menu.css'

/** Renders only on a Collection / depth-1 Set (sub-Sets don't own saved views). */
export function ViewMenu(): React.JSX.Element | null {
  const selection = useSession((st) => st.selection)
  const tree = useSession((st) => st.tree)
  const node =
    selection.kind === 'collection'
      ? findCollection(tree, selection.id)
      : selection.kind === 'set' && isDepth1Set(tree, selection.id)
        ? findSet(tree, selection.id)
        : undefined
  if (!node) return null
  return <ViewMenuInner key={node.id} node={node} />
}

function ViewMenuInner({ node }: { node: CollectionNode | SetNode }): React.JSX.Element {
  const tree = useSession((st) => st.tree)
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
    })
    if (action !== 'toggle-title') return
    await window.nexus.container.configure(node.path, node.kind, {
      view_button: labeled ? 'icon' : 'labeled',
    })
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
      {({ close }) => <ViewFrame node={node} schema={schema} onClose={close} />}
    </MenuDropdown>
  )
}
