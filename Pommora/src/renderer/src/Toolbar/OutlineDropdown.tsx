import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  SegmentedButton,
  type Segment,
} from '@renderer/design-system/components/Segmented-Controls'
import { useDismiss } from '@renderer/design-system/components/useDismiss'
import {
  DisclosureRow,
  MenuCaption,
  MenuScrollFrame,
  MenuSurface,
  itemEmphasized,
  useDisclosureSet,
} from '@renderer/design-system/components/menu'
import { useExitPresence } from '@renderer/design-system/useExitPresence'
import { openPageBody, useSession } from '../store'
import { viewSettingsScope } from '../Detail/ViewSettingsScope'
import { revealPageOffset } from '../Detail/pageEditor'
import { headingOutline } from '../MarkdownPM/editor/folding'
import { outlineTree, type OutlineNode } from './outlineTree'
import * as s from './viewDropdown.css'
import * as o from './outlineDropdown.css'

// KNOB — the gap the pane keeps from the window's right edge at full width.
const EDGE_INSET = 10

/** The page outline. Shares the Views button's slot rather than adding one: a selection is either a
 *  container or a Page, so this and `ViewDropdown` are never on screen together. */
export function OutlineDropdown(): React.JSX.Element | null {
  const selection = useSession((st) => st.selection)
  // Gate ABOVE the state, so leaving the Page unmounts it. Returning null below the hooks would keep
  // `open` alive with no wrapper to dismiss against — the pane would reappear, unasked, on return.
  return viewSettingsScope(selection) === 'page' ? <OutlineDropdownInner /> : null
}

function OutlineDropdownInner(): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  useDismiss(wrapRef, () => setOpen(false), open)
  const paneP = useExitPresence(open)
  // How wide the pane may grow before its right edge leaves the window. It is centred on the button,
  // so the room to that button's right counts twice. Measured from a live rect rather than offsetWidth
  // because the comparison is against the window: the cluster rides a translate, and the on-screen
  // position is precisely what that transform contributes.
  const anchorRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (!paneP.mounted) return
    // Written straight to the node, never held as state: nothing renders from it, and a resize fires
    // per frame while the window is dragged — routing it through React would re-render every row of
    // the outline on each one. Refs are read inside the callback, never captured: a detached node
    // measures all zeros, which reads as a successful measurement and silently uncaps the pane.
    const measure = (): void => {
      const wrap = wrapRef.current
      const anchor = anchorRef.current
      if (!wrap || !anchor) return
      const r = wrap.getBoundingClientRect()
      const max = 2 * Math.max(0, window.innerWidth - EDGE_INSET - (r.left + r.width / 2))
      anchor.style.setProperty('--outline-max', `${max}px`)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [paneP.mounted])

  const segment: Segment = {
    icon: 'list-tree',
    title: 'Outline',
    active: open,
    onClick: () => setOpen((v) => !v),
  }

  return (
    <div ref={wrapRef} className={s.wrapper}>
      <SegmentedButton segments={[segment]} className={s.button} labelCollapsed />
      {paneP.mounted && (
        <div ref={anchorRef} className={s.anchor}>
          <MenuSurface closing={paneP.closing} className={o.pane}>
            <OutlinePane />
          </MenuSurface>
        </div>
      )}
    </div>
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
