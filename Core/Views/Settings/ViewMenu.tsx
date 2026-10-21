import { reportRefusal } from '../../Interface/Notifications/notifications'
import type { CollectionNode, SetNode } from '../../Nexus/tree'
import { MenuDropdown } from '@pommora/uix/Menus'
import { useSession } from '../../Session/store'
import { namesContainer, topContainerOf } from '../../Archive/archivePlace'
import { containerSchema } from '../../Nexus/treePatch'
import { pickView } from '../Pipeline/pickView'
import { ViewFrame } from './ViewFrame'
import { viewGlyph } from '../viewIcon'
import * as s from '../../Interface/Toolbar/toolbar-menu.css'
import { dialer } from '../../Platform/dialer'
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
  const labeled = (node.viewButton ?? 'icon') === 'labeled'

  const schema = containerSchema(tree, node)
  const view = pickView(node, schema)

  const onContextMenu = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    const action = await popMenu(viewButtonMenuItems({ viewButton: node.viewButton ?? 'icon' }))
    if (action !== 'toggle-title') return
    reportRefusal(
      await dialer().ask('container:configure', node.path, node.kind, {
        view_button: labeled ? 'icon' : 'labeled',
      }),
    )
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
