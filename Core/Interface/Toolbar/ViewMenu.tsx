import type { CollectionNode, SetNode } from '../../Nexus/tree'
import { MenuDropdown } from '@pommora/uix/Menus/MenuDropdown'
import { useSession } from '../../Session/store'
import { containerSchema, topContainerOf } from '../../Nexus/treePatch'
import { namesContainer } from '../../Nexus/entities'
import { useActiveView } from '../../Views/Host/liveView'
import { ViewFrame } from '../../Views/Settings/ViewFrame'
import { viewGlyph } from '../../Views/viewIcon'
import * as s from './toolbar-menu.css'
import { popMenu } from '../../Actions/menuActions'
import { viewButtonMenuItems } from '../../Actions/viewMenus'

/** Renders on a Collection or a top-level Set and on either's Archive, so the dropdown holds across the toggle; a sub-Set's edits save to its one view. */
export function ViewMenu(): React.JSX.Element | null {
  const selection = useSession((st) => st.selection)
  const tree = useSession((st) => st.tree)
  const node = namesContainer(selection) ? topContainerOf(tree, selection.id) : undefined
  if (!node) return null
  return <ViewMenuInner key={node.id} node={node} />
}

function ViewMenuInner({ node }: { node: CollectionNode | SetNode }): React.JSX.Element {
  const tree = useSession((st) => st.tree)
  const mutate = useSession((st) => st.mutate)
  const labeled = (node.viewButton ?? 'icon') === 'labeled'

  const schema = containerSchema(tree, node)
  const view = useActiveView(node)

  const onContextMenu = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    const action = await popMenu(viewButtonMenuItems({ viewButton: node.viewButton ?? 'icon' }))
    if (action !== 'toggle-title') return
    void mutate({
      op: 'setViewButton',
      path: node.path,
      kind: node.kind,
      viewButton: labeled ? 'icon' : 'labeled',
    })
  }

  return (
    <MenuDropdown
      icon={viewGlyph(view)}
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
