import { useEffect, useState, type CSSProperties } from 'react'
import { useSession } from '../Session/store'
import { INSPECTOR_WIDTH, SIDEBAR_WIDTH } from '../Session/layoutSlice'
import { useResizeFrame } from '@pommora/uix/Interactions/ResizeFrame'
import { Surface } from './InterfaceScaffold'
import { paneSlide } from '@pommora/uix/Animations/paneSlide'
import { Sidebar } from './Sidebar/Sidebar'
import { Ribbon } from './Sidebar/Ribbon'
import { ContentView } from './ContentView'
import { Toolbar } from './Toolbar/Toolbar'
import { InspectorPane } from './SidePane/SidePane'
import { NavWindow } from './Windows/NavWindow'
import { PageWindow } from './Windows/PageWindow'
import { PageHistoryWindow } from './Windows/PageHistoryWindow'
import { WebWindow } from '@pommora/core/Interface/Windows/WebWindow'
import { SettingsWindow } from '../Settings/SettingsWindow'
import { IterationWindow } from './Windows/IterationWindow'
import { ConfirmationWindow } from './Confirm/ConfirmationWindow'
import { NotificationLabel } from './Notifications/NotificationLabel'
import { GlancePane } from './Glance/GlancePane'
import { useNavThumbnails } from '../Navigation/useNavThumbnails'
import { Button } from '@pommora/uix/Buttons/Button'
import { Icon } from '@pommora/uix/Symbols'
import { matchesCommand } from '@pommora/uix/Interactions/chords'
import { useBridgeSubscriptions } from '../Session/useBridgeSubscriptions'
import { popRowMenu, useNativeMenus } from '../Actions/nativeMenus'
import { NativePickerContext } from '@pommora/uix/Pickers/PickerControl'
import { RowMenuHost } from './Menus/RowMenuHost'

export function App(): React.JSX.Element {
  // Per-field selectors, never the bare hook — the shell must not re-render on every store set().
  const status = useSession((s) => s.status)
  const tree = useSession((s) => s.tree)
  const error = useSession((s) => s.error)
  const sidebarVisible = useSession((s) => s.sidebarVisible)
  const sidebarWidth = useSession((s) => s.sidebarWidth)
  const setSidebarWidth = useSession((s) => s.setSidebarWidth)
  const inspectorWidth = useSession((s) => s.inspectorWidth)
  const setInspectorWidth = useSession((s) => s.setInspectorWidth)
  const persistPaneWidths = useSession((s) => s.persistPaneWidths)
  const load = useSession((s) => s.load)
  const choose = useSession((s) => s.choose)
  const toggleSidebar = useSession((s) => s.toggleSidebar)
  const openDropped = useSession((s) => s.openDropped)
  const ribbonVisible = useSession((s) => s.ribbonVisible)
  const toggleRibbon = useSession((s) => s.toggleRibbon)
  const toggleIteration = useSession((s) => s.toggleIteration)
  const toggleNav = useSession((s) => s.toggleNav)
  const commands = useSession((s) => s.commands)
  useNavThumbnails()

  const [inspectorOpen, setInspectorOpen] = useState(false)

  const sidebarFrame = useResizeFrame({
    rect: { w: sidebarWidth },
    min: { w: SIDEBAR_WIDTH.min },
    max: { w: SIDEBAR_WIDTH.max },
    equilateral: true,
    onChange: (next, phase) => (phase === 'drop' ? persistPaneWidths() : setSidebarWidth(next.w)),
  })
  const inspectorFrame = useResizeFrame({
    rect: { w: inspectorWidth },
    min: { w: INSPECTOR_WIDTH.min },
    max: { w: INSPECTOR_WIDTH.max },
    equilateral: true,
    onChange: (next, phase) => (phase === 'drop' ? persistPaneWidths() : setInspectorWidth(next.w)),
  })
  const resizing = sidebarFrame.active !== null || inspectorFrame.active !== null

  useEffect(() => {
    void load()
  }, [load])

  useBridgeSubscriptions()
  const nativePicker = useNativeMenus() ? popRowMenu : null

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.defaultPrevented) return
      if (matchesCommand(commands['toggle-ribbon'], e)) {
        e.preventDefault()
        toggleRibbon()
      } else if (matchesCommand(commands['toggle-nav'], e)) {
        e.preventDefault()
        toggleNav()
      } else if (matchesCommand('cmd+shift+t', e)) {
        e.preventDefault()
        toggleIteration()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [commands, toggleRibbon, toggleNav, toggleIteration])

  const sidebarHidden = status === 'ready' && !sidebarVisible

  return (
    <NativePickerContext.Provider value={nativePicker}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: a drag-and-drop target, not a control */}
      <div
        className={
          'shell' +
          (sidebarHidden ? ' sidebar-hidden' : '') +
          (ribbonVisible ? '' : ' ribbon-hidden') +
          (inspectorOpen ? ' inspector-open' : '') +
          (resizing ? ' is-resizing' : '')
        }
        style={
          {
            '--sidebar-width': `${sidebarWidth}px`,
            '--inspector-width': `${inspectorWidth}px`,
          } as CSSProperties
        }
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          if (file) void openDropped(file)
        }}
      >
        <div className="titlebar" />
        {status === 'ready' && (
          <Toolbar
            inspectorOpen={inspectorOpen}
            onToggleInspector={() => setInspectorOpen((v) => !v)}
          />
        )}
        <main className="content-pane">
          <ContentView />
        </main>
        <Surface className={paneSlide({ side: 'left', mode: 'overlay' })}>
          {status === 'ready' && tree && <Ribbon />}
          <Button
            size="button-large"
            paddingX="0"
            className="sidebar-toggle sidebar-collapse"
            onClick={toggleSidebar}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <Icon name="log-out" size="titleSmall" className="flip-x" />
          </Button>
          {status === 'loading' && <div className="state">Loading Nexus…</div>}
          {status === 'empty' && (
            <div className="state">
              No Nexus Open
              <Button label="Open Folder…" className="open-btn" onClick={() => void choose()} />
            </div>
          )}
          {status === 'error' && (
            <div className="state state-error">
              Couldn’t Open Nexus
              <span className="state-detail">{error?.message}</span>
            </div>
          )}
          {status === 'ready' && tree && <Sidebar tree={tree} />}
        </Surface>
        {status === 'ready' && !sidebarHidden && <div className="sidebar-titlebar" />}
        {!sidebarHidden && (
          <div
            className="resize-strip sidebar-resize"
            onPointerDown={sidebarFrame.start('e')}
            aria-hidden="true"
          />
        )}
        <Button
          size="button-large"
          paddingX="0"
          className="sidebar-toggle sidebar-expand"
          onClick={toggleSidebar}
          aria-label="Show sidebar"
          title="Show sidebar"
        >
          <Icon name="log-out" size="titleSmall" />
        </Button>
        {status === 'ready' && <InspectorPane open={inspectorOpen} />}
        {status === 'ready' && <NavWindow />}
        {status === 'ready' && <PageWindow />}
        {status === 'ready' && <PageHistoryWindow />}
        {status === 'ready' && <WebWindow />}
        {status === 'ready' && <SettingsWindow />}
        {status === 'ready' && <IterationWindow />}
        <ConfirmationWindow />
        <RowMenuHost />
        <NotificationLabel />
        {status === 'ready' && <GlancePane />}
        {status === 'ready' && inspectorOpen && (
          <div
            className="resize-strip inspector-resize"
            onPointerDown={inspectorFrame.start('w')}
            aria-hidden="true"
          />
        )}
      </div>
    </NativePickerContext.Provider>
  )
}
