import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useSession } from './store'
import { Surface } from '@renderer/DesignSystem/Glass/glass-pane'
import { Sidebar } from './Sidebar/Sidebar'
import { Ribbon } from './Sidebar/Ribbon'
import { ContentView } from './Interface/ContentView'
import { Toolbar } from './Toolbar/Toolbar'
import { InspectorPane } from './Interface/InspectorPane/InspectorPane'
import { NavWindow } from './Windows/NavWindow'
import { PageWindow } from './Windows/PageWindow'
import { WebWindow } from './Windows/WebWindow'
import { SettingsWindow } from './Settings/SettingsWindow'
import { IterationWindow } from './Utilities/iteration-window'
import { ConfirmationWindow } from './Windows/ConfirmationWindow'
import { NotificationLabel } from './Interface/NotificationLabel'
import { confirmDelete } from './Windows/confirmations'
import { ConnectionPane } from './Links/ConnectionPane'
import { contextTargetToSelect } from './Tabs/tabsModel'
import { useNavThumbnails } from './Navigation/useNavThumbnails'
import { Button } from '@renderer/DesignSystem/Buttons'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { matchesCommand } from '@renderer/Actions/commands'
import { openWebLink } from './Links/openWebLink'

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
  const applyTree = useSession((s) => s.applyTree)
  const applyNavChanged = useSession((s) => s.applyNavChanged)
  const applyAssetMap = useSession((s) => s.applyAssetMap)
  const nexusRoot = useSession((s) => s.tree?.nexus.rootPath)
  const choose = useSession((s) => s.choose)
  const openDropped = useSession((s) => s.openDropped)
  const toggleSidebar = useSession((s) => s.toggleSidebar)
  const ribbonVisible = useSession((s) => s.ribbonVisible)
  const toggleRibbon = useSession((s) => s.toggleRibbon)
  const toggleIteration = useSession((s) => s.toggleIteration)
  const toggleNav = useSession((s) => s.toggleNav)
  const commands = useSession((s) => s.commands)
  const newPage = useSession((s) => s.newPage)
  const openNewTab = useSession((s) => s.openNewTab)
  const beginRename = useSession((s) => s.beginRename)
  const beginIcon = useSession((s) => s.beginIcon)
  const newPageAdjacent = useSession((s) => s.newPageAdjacent)
  const select = useSession((s) => s.select)
  useNavThumbnails()

  const [inspectorOpen, setInspectorOpen] = useState(false)

  const [resizing, setResizing] = useState(false)
  const drag = useRef({ active: false, startX: 0, startW: 0 })
  const onResizeDown = (e: ReactPointerEvent<HTMLDivElement>): void => {
    drag.current = { active: true, startX: e.clientX, startW: sidebarWidth }
    e.currentTarget.setPointerCapture(e.pointerId)
    setResizing(true)
  }
  const onResizeMove = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (!drag.current.active) return
    setSidebarWidth(drag.current.startW + (e.clientX - drag.current.startX))
  }
  const onResizeUp = (): void => {
    drag.current.active = false
    setResizing(false)
    persistPaneWidths()
  }

  const inspectorDrag = useRef({ active: false, startX: 0, startW: 0 })
  const onInspectorResizeDown = (e: ReactPointerEvent<HTMLDivElement>): void => {
    inspectorDrag.current = { active: true, startX: e.clientX, startW: inspectorWidth }
    e.currentTarget.setPointerCapture(e.pointerId)
    setResizing(true)
  }
  const onInspectorResizeMove = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (!inspectorDrag.current.active) return
    setInspectorWidth(inspectorDrag.current.startW - (e.clientX - inspectorDrag.current.startX))
  }
  const onInspectorResizeUp = (): void => {
    inspectorDrag.current.active = false
    setResizing(false)
    persistPaneWidths()
  }

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    return window.nexus.onBeginRename(({ path, create, host }) => beginRename(path, create, host))
  }, [beginRename])

  useEffect(() => {
    return window.nexus.onBeginIcon(({ path }) => beginIcon(path))
  }, [beginIcon])

  useEffect(() => {
    return window.nexus.onNewPageAdjacent(
      ({ path, where, host }) => void newPageAdjacent(path, where, host),
    )
  }, [newPageAdjacent])

  useEffect(() => {
    return window.nexus.onOpenInNewTab((target) => {
      if (!target.id) return
      void select(contextTargetToSelect({ kind: target.kind, id: target.id, path: target.path }), {
        newTab: true,
      })
    })
  }, [select])

  useEffect(() => window.nexus.onConfirmDelete((target) => void confirmDelete(target)), [])

  const openPreview = useSession((s) => s.openPreview)
  useEffect(() => {
    return window.nexus.onOpenInPreview((target) => {
      if (target.id) openPreview({ id: target.id, path: target.path })
    })
  }, [openPreview])

  useEffect(() => {
    return window.nexus.onNexusChanged((next) => void applyTree(next))
  }, [applyTree])

  const bumpContainerValues = useSession((s) => s.bumpContainerValues)
  useEffect(() => window.nexus.onValuesChanged(bumpContainerValues), [bumpContainerValues])

  useEffect(() => {
    return window.nexus.onNavChanged((nav) => applyNavChanged(nav))
  }, [applyNavChanged])

  useEffect(() => {
    void window.nexus.assetMap().then(applyAssetMap)
    return window.nexus.onAssetsChanged((map) => applyAssetMap(map))
  }, [applyAssetMap, nexusRoot])

  useEffect(() => {
    return window.nexus.onWebPopup((url) => openWebLink(url))
  }, [])

  useEffect(() => {
    return window.nexus.onMenuAction((action) => {
      switch (action) {
        case 'open':
          void choose()
          break
        case 'new-tab': {
          const s = useSession.getState()
          const p = s.preview
          const active =
            p?.flavor === 'page' ? p.tabs.find((t) => t.id === p.activeTabId) : undefined
          if (active && active.target.kind === 'page') {
            void s.select(
              { kind: 'page', id: active.target.id, path: active.target.path },
              { newTab: true },
            )
            s.closePreviewTab(active.id, 'engulf')
          } else openNewTab()
          break
        }
        case 'new-page':
          void newPage()
          break
        case 'toggle-sidebar':
          toggleSidebar()
          break
        case 'reload-state':
          void load()
          break
      }
    })
  }, [choose, newPage, openNewTab, toggleSidebar, load])

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
    // biome-ignore lint/a11y/noStaticElementInteractions: a drag-and-drop target, not a control
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
      <Surface>
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
          className="sidebar-resize"
          onPointerDown={onResizeDown}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeUp}
          onPointerCancel={onResizeUp}
          onLostPointerCapture={onResizeUp}
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
      {status === 'ready' && <WebWindow />}
      {status === 'ready' && <SettingsWindow />}
      {status === 'ready' && <IterationWindow />}
      <ConfirmationWindow />
      <NotificationLabel />
      {status === 'ready' && <ConnectionPane />}
      {status === 'ready' && inspectorOpen && (
        <div
          className="inspector-resize"
          onPointerDown={onInspectorResizeDown}
          onPointerMove={onInspectorResizeMove}
          onPointerUp={onInspectorResizeUp}
          onPointerCancel={onInspectorResizeUp}
          onLostPointerCapture={onInspectorResizeUp}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
