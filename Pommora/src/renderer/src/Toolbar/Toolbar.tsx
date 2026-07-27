import { useEffect, useRef, useState } from 'react'
import {
  SegmentedSymbol,
  type Segment,
} from '@renderer/design-system/components/Segmented-Controls'
import { useDismiss } from '@renderer/design-system/components/useDismiss'
import { ToolbarTrio } from './ToolbarTrio'
import { ViewDropdown } from './ViewDropdown'
import { SpaceDropdown } from './SpaceDropdown'
import { NavPane } from './NavPane'
import { TabBar } from '../Tabs/TabBar'
import { activeUnpinnedTab } from '../Tabs/tabsModel'
import { SettingsDropdown } from '../Components/Detail/SettingsDropdown'
import { useSession } from '../store'
import { useExitPresence } from '@renderer/design-system/useExitPresence'
import './toolbar.css'

type TrioPanel = 'navigation' | 'settings'
/** A trio segment tagged with the panel it opens, so its beak is aimed by identity rather than by
 *  position — inserting or reordering a button can't silently misaim a dropdown. */
type TrioSegment = Segment & { panel?: TrioPanel }

/**
 * The two persistent toolbar clusters, floated in the top window strip:
 * Back/Forward (leading) and the Navigation · Settings · Inspector trio (trailing).
 * The only always-in-view chrome; each button's behaviour/content depends on the
 * active view (Navigation + Settings are stub panels for now).
 */
export function Toolbar({
  inspectorOpen,
  onToggleInspector,
}: {
  inspectorOpen: boolean
  onToggleInspector: () => void
}): React.JSX.Element {
  const [panel, setPanel] = useState<TrioPanel | null>(null)
  const [beaks, setBeaks] = useState<number[]>([])
  const trioRef = useRef<HTMLDivElement>(null)
  useDismiss(trioRef, () => setPanel(null), panel !== null)
  // Each dropdown stays mounted through its retract animation before leaving the DOM.
  const navP = useExitPresence(panel === 'navigation')
  const settingsP = useExitPresence(panel === 'settings')

  // Publish the pill's measured width so the ride math (toolbar.css) knows where the trio's left edge
  // sits — it lands flush at the inspector's left corner. offsetWidth ignores the ride transform.
  // The same pass measures each trio button's centre against the pill's right edge: the dropdowns hang
  // right-aligned under the cluster, so that distance is the button's beak inset.
  useEffect(() => {
    const el = trioRef.current
    if (!el) return
    const apply = (): void => {
      // Published on the whole toolbar (not the trio or its group) so BOTH the right cluster's swallow
      // transform and the tab-bar's right-edge condense read one --toolbar-swallow magnitude — the +
      // stays flush against the swallowing cluster. CSS vars inherit downward from the common ancestor.
      el.closest<HTMLElement>('.app-toolbar')?.style.setProperty('--trio-w', `${el.offsetWidth}px`)
      // Both rects carry the cluster's ride transform, so their difference is free of it. The cover
      // layer alone — the glass layer behind it holds a hidden duplicate of every button.
      const right = el.getBoundingClientRect().right
      const next = Array.from(
        el.querySelectorAll<HTMLElement>('.toolbar-trio-cover button'),
        (b) => {
          const r = b.getBoundingClientRect()
          return right - (r.left + r.width / 2)
        },
      )
      setBeaks((prev) =>
        prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next,
      )
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const toggle = (p: TrioPanel): void => setPanel((cur) => (cur === p ? null : p))

  const goBack = useSession((s) => s.goBack)
  const goForward = useSession((s) => s.goForward)
  // Back/Forward act on the ACTIVE tab's own history (D-7); a pinned/newtab active tab (not in `tabs`)
  // carries none, so both disable.
  const canGoBack = useSession((s) => {
    const a = activeUnpinnedTab(s.tabs, s.activeTabId)
    return !!a && a.navIndex > 0
  })
  const canGoForward = useSession((s) => {
    const a = activeUnpinnedTab(s.tabs, s.activeTabId)
    return !!a && a.navIndex < a.navStack.length - 1
  })

  // Back/Forward walk the store's navigation history (disabled at each end).
  const backForward: Segment[] = [
    { icon: 'chevron-left', title: 'Back', onClick: goBack, disabled: !canGoBack },
    { icon: 'chevron-right', title: 'Forward', onClick: goForward, disabled: !canGoForward },
  ]
  const trio: TrioSegment[] = [
    {
      icon: 'map',
      title: 'Navigation',
      panel: 'navigation',
      onClick: () => toggle('navigation'),
      active: panel === 'navigation',
    },
    {
      icon: 'sliders-horizontal',
      title: 'Settings',
      panel: 'settings',
      onClick: () => toggle('settings'),
      active: panel === 'settings',
    },
    { icon: 'panel-right', title: 'Inspector', onClick: onToggleInspector, active: inspectorOpen },
  ]
  // Undefined until the trio is measured (and for an untagged segment) — NotchedPane centres the beak.
  const beakFor = (p: TrioPanel): number | undefined => beaks[trio.findIndex((s) => s.panel === p)]

  return (
    <div className="app-toolbar">
      <div className="app-toolbar-cluster app-toolbar-cluster--nav">
        <SegmentedSymbol segments={backForward} paddingX="6px" iconSize="lg" />
      </div>
      <TabBar />
      <div className="app-toolbar-right">
        <ViewDropdown />
        <SpaceDropdown />
        <div className="app-toolbar-cluster app-toolbar-cluster--trio" ref={trioRef}>
          <ToolbarTrio segments={trio} />
          {navP.mounted && (
            <NavPane closing={navP.closing} notchInsetRight={beakFor('navigation')} />
          )}
          {settingsP.mounted && (
            <SettingsDropdown closing={settingsP.closing} notchInsetRight={beakFor('settings')} />
          )}
        </div>
      </div>
    </div>
  )
}
