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
import { useSession } from '../../Session/store'
import { renameHeadingAtOffset, travelPageTo, usePageOutline } from '../../Pages/pageEditor'
import { outlineTree, type OutlineNode } from '../../MarkdownPM/Engine/outlineTree'
import { OutlineDnd, useOutlineDrag } from './OutlineDnd'
import * as s from './toolbar-menu.css'
import * as o from './outline-menu.css'
import { rowDragging } from '@pommora/uix/Menus/menu-row.css'

type Disclosure = ReturnType<typeof useDisclosureSet>

// KNOB — the gap the pane keeps from the window's right edge at full width.
const EDGE_INSET = 10

export function OutlineMenu(): React.JSX.Element | null {
  const onPage = useSession((st) => st.selection.kind === 'page')
  // Gate ABOVE the menu, so leaving the Page unmounts it: rendering null below the shell's hooks would keep `open` alive with no wrapper to dismiss against.
  if (!onPage) return null
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

/** Mounted only while the menu is open, so a closed outline costs a page nothing. */
function OutlinePane(): React.JSX.Element {
  const flat = usePageOutline()
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
        <RenamableLabel
          renames="row"
          editing={editing}
          value={node.text}
          className={titleInput}
          autoSize
          onBegin={() => setRenaming(node.key)}
          onCommit={(next) => {
            setRenaming(null)
            renameHeadingAtOffset(node.from, next)
          }}
          onCancel={() => setRenaming(null)}
        />
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
