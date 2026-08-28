import { useEffect, useRef, useState } from 'react'
import { Segmented, type Segment } from '@renderer/DesignSystem/Controls/Button'
import { useDismiss } from '@renderer/DesignSystem/Interactions/useDismiss'
import { ToolbarTrio } from './ToolbarTrio'
import { ViewMenu } from './ViewMenu'
import { SpaceMenu } from './SpaceMenu'
import { OutlineMenu } from './OutlineMenu'
import { NavMenu } from './NavMenu'
import { TabBar } from '../Tabs/TabBar'
import { activeUnpinnedTab } from '../Tabs/tabsModel'
import { SettingsMenu } from '../Frames/SettingsMenu'
import { useSession } from '../store'
import { useExitPresence } from '@renderer/DesignSystem/Animation/useExitPresence'
import './toolbar.css'

type TrioPanel = 'navigation' | 'settings'
type TrioSegment = Segment & { panel?: TrioPanel }

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
  const navP = useExitPresence(panel === 'navigation')
  const settingsP = useExitPresence(panel === 'settings')

  useEffect(() => {
    const el = trioRef.current
    if (!el) return
    const apply = (): void => {
      el.closest<HTMLElement>('.app-toolbar')?.style.setProperty('--trio-w', `${el.offsetWidth}px`)
      // Both rects carry the cluster's ride transform, so their difference cancels it out.
      // Measures the cover layer alone — the glass layer behind holds a hidden duplicate of every button.
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
  const canGoBack = useSession((s) => {
    const a = activeUnpinnedTab(s.tabs, s.activeTabId)
    return !!a && a.navIndex > 0
  })
  const canGoForward = useSession((s) => {
    const a = activeUnpinnedTab(s.tabs, s.activeTabId)
    return !!a && a.navIndex < a.navStack.length - 1
  })

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
  const beakFor = (p: TrioPanel): number | undefined => beaks[trio.findIndex((s) => s.panel === p)]

  return (
    <div className="app-toolbar">
      <div className="app-toolbar-cluster app-toolbar-cluster--nav">
        <Segmented glass segments={backForward} paddingX="6px" iconSize="titleSmall" />
      </div>
      <TabBar />
      <div className="app-toolbar-right">
        <ViewMenu />
        <OutlineMenu />
        <SpaceMenu />
        <div className="app-toolbar-cluster app-toolbar-cluster--trio" ref={trioRef}>
          <ToolbarTrio segments={trio} />
          {navP.mounted && (
            <NavMenu closing={navP.closing} notchInsetRight={beakFor('navigation')} />
          )}
          {settingsP.mounted && (
            <SettingsMenu closing={settingsP.closing} notchInsetRight={beakFor('settings')} />
          )}
        </div>
      </div>
    </div>
  )
}
