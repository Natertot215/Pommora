import { useMemo } from 'react'
import {
  DisclosureRow,
  MenuCaption,
  MenuDropdown,
  MenuScrollFrame,
  itemEmphasized,
  useDisclosureSet,
} from '@renderer/design-system/components/menu'
import { openPageBody, useSession } from '../store'
import { viewSettingsScope } from '../Detail/ViewSettingsScope'
import { revealPageOffset } from '../Detail/pageEditor'
import { headingOutline } from '../MarkdownPM/editor/folding'
import { outlineTree, type OutlineNode } from './outlineTree'
import * as s from './toolbarDropdown.css'
import * as o from './outlineDropdown.css'

// KNOB — the gap the pane keeps from the window's right edge at full width.
const EDGE_INSET = 10

/** The page outline. Shares the Views button's slot rather than adding one: a selection is either a
 *  container or a Page, so this and `ViewDropdown` are never on screen together. */
export function OutlineDropdown(): React.JSX.Element | null {
  const selection = useSession((st) => st.selection)
  // Gate ABOVE the dropdown, so leaving the Page unmounts it. Rendering null below the shell's hooks
  // would keep `open` alive with no wrapper to dismiss against — the pane would reappear, unasked.
  if (viewSettingsScope(selection) !== 'page') return null
  return (
    <MenuDropdown
      icon="list-tree"
      title="Outline"
      edgeInset={EDGE_INSET}
      classNames={{ ...s.chrome, pane: o.pane }}
    >
      {() => <OutlinePane />}
    </MenuDropdown>
  )
}

/** Mounted only while the dropdown is open, so a closed outline costs a page nothing — the derivation
 *  is a whole-document scan and the body changes as fast as the editor's live buffer publishes. */
function OutlinePane(): React.JSX.Element {
  const pageDetail = useSession((st) => st.pageDetail)
  const liveBody = useSession((st) => st.liveBody)
  const body = openPageBody(pageDetail, liveBody)
  const tree = useMemo(() => outlineTree(headingOutline(body)), [body])
  // Headings disclose open — an outline's job is to show the shape, not to be unpacked first.
  const disclosure = useDisclosureSet(true)

  const rows = (nodes: OutlineNode[]): React.JSX.Element[] =>
    nodes.map((node) => {
      // A childless heading passes no children at all: an empty array still reads as content to
      // DisclosureRow, which would hang an empty rail off a leaf.
      const nested = node.children.length > 0
      return (
        <DisclosureRow
          key={node.key}
          title={node.text}
          icon={null}
          className={itemEmphasized}
          twisty={nested ? 'chevron' : 'spacer'}
          open={disclosure.has(node.key)}
          onToggle={() => disclosure.toggle(node.key)}
          onClick={() => revealPageOffset(node.from)}
        >
          {nested ? rows(node.children) : undefined}
        </DisclosureRow>
      )
    })

  return (
    <MenuScrollFrame>
      {tree.length > 0 ? rows(tree) : <MenuCaption>No headings</MenuCaption>}
    </MenuScrollFrame>
  )
}
