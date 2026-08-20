import type { CollectionNode, SetNode, ViewButton, ViewStyle } from '@shared/types'
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
    // Every arm named, so an action this menu grows and nobody handles is a compile error rather
    // than a silent write of the last branch's value.
    const patch = ((): { view_button?: ViewButton; view_style?: ViewStyle } | null => {
      switch (action) {
        case 'toggle-title':
          return { view_button: labeled ? 'icon' : 'labeled' }
        case 'style-dropdown':
          return { view_style: 'dropdown' }
        case 'style-toolbar':
          return { view_style: 'toolbar' }
        default: {
          const _exhaustive: never = action
          void _exhaustive
          return null
        }
      }
    })()
    if (!patch) return
    await window.nexus.container.configure(node.path, node.kind, patch)
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
