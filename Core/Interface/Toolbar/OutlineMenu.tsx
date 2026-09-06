import { useMemo, useState } from 'react'
import {
  DisclosureRow,
  MenuCaption,
  MenuDropdown,
  MenuScrollFrame,
  itemEmphasized,
  titleInput,
  useDisclosureSet,
} from '@pommora/uix/Menus'
import { RenamableLabel } from '@pommora/uix/Fields/RenamableLabel'
import { pageBody, shownPage, useSession } from '../../Session/store'
import { viewSettingsScope } from './viewSettingsScope'
import { renameHeadingAtOffset, travelPageTo } from '../../Pages/pageEditor'
import { headingOutline } from '../../MarkdownPM/Engine/headingScan'
import { outlineTree, type OutlineNode } from '../../MarkdownPM/Engine/outlineTree'
import { OutlineDnd, useOutlineDrag } from './OutlineDnd'
import * as s from './toolbar-menu.css'
import * as o from './outline-menu.css'
import { rowDragging } from '@pommora/uix/Menus/menu-base.css'

type Disclosure = ReturnType<typeof useDisclosureSet>

// KNOB — the gap the pane keeps from the window's right edge at full width.
const EDGE_INSET = 10

/** Shares the Views button's slot rather than adding one: a selection is either a container or a Page, so this and `ViewMenu` are never on screen together. */
export function OutlineMenu(): React.JSX.Element | null {
  const selection = useSession((st) => st.selection)
  // Gate ABOVE the menu, so leaving the Page unmounts it: rendering null below the shell's hooks would keep `open` alive with no wrapper to dismiss against.
  if (viewSettingsScope(selection) !== 'page') return null
  return (
    <MenuDropdown
      icon="list-tree"
      title="Outline"
      edgeInset={EDGE_INSET}
      dismissOnOutside={false}
      classNames={{ ...s.chrome, pane: o.pane }}
    >
      {() => <OutlinePane />}
    </MenuDropdown>
  )
}

/** Mounted only while the menu is open, so a closed outline costs a page nothing — the derivation is a whole-document scan. */
function OutlinePane(): React.JSX.Element {
  const body = useSession((st) => pageBody(shownPage(st)))
  const flat = useMemo(() => headingOutline(body), [body])
  const tree = useMemo(() => outlineTree(flat), [flat])
  const disclosure = useDisclosureSet(true)
  const [renaming, setRenaming] = useState<string | null>(null)

  const rows = (nodes: OutlineNode[]): React.JSX.Element[] =>
    nodes.map((node) => (
      <OutlineRow
        key={node.key}
        node={node}
        disclosure={disclosure}
        renaming={renaming}
        setRenaming={setRenaming}
      >
        {node.children.length > 0 ? rows(node.children) : undefined}
      </OutlineRow>
    ))

  return (
    <MenuScrollFrame>
      {tree.length > 0 ? (
        <OutlineDnd flat={flat}>{rows(tree)}</OutlineDnd>
      ) : (
        <MenuCaption>No headings</MenuCaption>
      )}
    </MenuScrollFrame>
  )
}

/** Its own component so the drag hook runs once per row, order-stable. */
function OutlineRow({
  node,
  disclosure,
  renaming,
  setRenaming,
  children,
}: {
  node: OutlineNode
  disclosure: Disclosure
  renaming: string | null
  setRenaming: (key: string | null) => void
  children?: React.ReactNode
}): React.JSX.Element {
  const drag = useOutlineDrag(node.key)
  const nested = node.children.length > 0
  const editing = renaming === node.key
  return (
    <DisclosureRow
      title={
        editing ? (
          <RenamableLabel
            renames="row"
            editing
            value={node.text}
            className={titleInput}
            autoSize
            onCommit={(next) => {
              setRenaming(null)
              renameHeadingAtOffset(node.from, next)
            }}
            onCancel={() => setRenaming(null)}
          />
        ) : (
          node.text
        )
      }
      icon={null}
      className={itemEmphasized}
      dropOutline={nested ? 'chevron' : 'spacer'}
      open={disclosure.has(node.key)}
      onToggle={() => disclosure.toggle(node.key)}
      onClick={editing ? undefined : () => travelPageTo(node.from)}
      onContextMenu={(e) => {
        e.preventDefault()
        setRenaming(node.key)
      }}
      wrap={(row) => (
        <div ref={drag.ref} {...drag.handle} className={drag.isDragging ? rowDragging : undefined}>
          {row}
        </div>
      )}
    >
      {children}
    </DisclosureRow>
  )
}
