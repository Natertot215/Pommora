import { useEffect, useRef, useState } from 'react'
import { Segmented, type Segment } from '@pommora/uix/Buttons/Button'
import { useDismissal } from '@pommora/uix/Interactions/dismissalStack'
import { ToolbarTrio } from './ToolbarTrio'
import { ViewMenu } from '../../Views/Settings/ViewMenu'
import { OutlineMenu } from './OutlineMenu'
import { TabBar } from '../../Navigation/TabBar'
import { activeUnpinnedTab } from '../../Navigation/tabsModel'
import { SettingsMenu } from './SettingsMenu'
import { viewSettingsScope } from './viewSettingsScope'
import { useSession } from '../../Session/store'
import { publishChromePart } from '../chromeParts'
import { useExitPresence } from '@pommora/uix/Animations/useExitPresence'
import './toolbar.css'
import '@pommora/uix/Animations/toolbar-slide.css'

type TrioSegment = Segment & { panel?: boolean }

export function Toolbar({
  sidePaneOpen,
  onToggleSidePane,
}: {
  sidePaneOpen: boolean
  onToggleSidePane: () => void
}): React.JSX.Element {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [beaks, setBeaks] = useState<number[]>([])
  const trioRef = useRef<HTMLDivElement>(null)
  const matrixPane = useSession((s) => viewSettingsScope(s.selection) === 'matrix')
  useDismissal(settingsOpen, false, {
    layer: () => trioRef.current,
    dismiss: () => setSettingsOpen(false),
    outsidePress: !matrixPane,
  })
  const settingsP = useExitPresence(settingsOpen)

  useEffect(() => {
    const el = trioRef.current
    if (!el) return
    const apply = (): void => {
      el.closest<HTMLElement>('.app-toolbar')?.style.setProperty('--trio-w', `${el.offsetWidth}px`)
      // Both rects carry the cluster's ride transform, so their difference cancels it out. Skips the inert glass layer, which holds a hidden duplicate of every button.
      const right = el.getBoundingClientRect().right
      const next = Array.from(
        el.querySelectorAll<HTMLElement>('.toolbar-trio > :not([inert]) button'),
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

  const flat = useSession((s) => s.hostPlatform === 'windows')
  const toggleNav = useSession((s) => s.toggleNav)
  const navOpen = useSession((s) => s.navOpen)
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
    { icon: 'map', title: 'Navigation', onClick: toggleNav, active: navOpen },
    {
      icon: 'sliders-horizontal',
      title: 'Settings',
      panel: true,
      onClick: () => setSettingsOpen((v) => !v),
      active: settingsOpen,
    },
    { icon: 'panel-right', title: 'Side Pane', onClick: onToggleSidePane, active: sidePaneOpen },
  ]
  const settingsBeak = beaks[trio.findIndex((s) => s.panel)]

  return (
    <div className="app-toolbar" ref={publishChromePart('toolbar')}>
      <div className="app-toolbar-cluster app-toolbar-cluster--nav">
        <Segmented glass segments={backForward} paddingX="6px" iconSize="titleSmall" />
      </div>
      <TabBar />
      <div className="app-toolbar-right">
        <ViewMenu />
        <OutlineMenu />
        <div className="app-toolbar-cluster app-toolbar-cluster--trio" ref={trioRef}>
          <ToolbarTrio segments={trio} flat={flat} />
          {settingsP.mounted && (
            <SettingsMenu closing={settingsP.closing} notchInsetRight={settingsBeak} />
          )}
        </div>
      </div>
    </div>
  )
}
