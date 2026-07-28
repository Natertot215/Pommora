import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useSession } from './store'
import { Surface } from './Components/Surface'
import { Sidebar } from './Sidebar/Sidebar'
import { Ribbon } from './Sidebar/Ribbon'
import { DetailPane } from './Detail/DetailPane'
import { Toolbar } from './Toolbar/Toolbar'
import { InspectorPanel } from './Detail/InspectorPanel/InspectorPanel'
import { NavWindow } from './NavWindow/NavWindow'
import { PreviewWindow } from './PagePreview/PreviewWindow'
import { SettingsWindow } from './Settings/SettingsWindow'
import { contextTargetToSelect } from './Tabs/tabsModel'
import { useNavThumbnails } from './Navigation/useNavThumbnails'
import { Icon } from '@renderer/design-system/symbols'
import { matchesCommand } from './Commands'

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
  const choose = useSession((s) => s.choose)
  const openDropped = useSession((s) => s.openDropped)
  const toggleSidebar = useSession((s) => s.toggleSidebar)
  const ribbonVisible = useSession((s) => s.ribbonVisible)
  const toggleRibbon = useSession((s) => s.toggleRibbon)
  const toggleNav = useSession((s) => s.toggleNav)
  const commands = useSession((s) => s.commands)
  const newPage = useSession((s) => s.newPage)
  const openNewTab = useSession((s) => s.openNewTab)
  const beginRename = useSession((s) => s.beginRename)
  const select = useSession((s) => s.select)
  useNavThumbnails() // capture-on-open detail-pane thumbnails for the gallery

  const [inspectorOpen, setInspectorOpen] = useState(false)

  // `resizing` suspends the collapse transition so the panel tracks the cursor 1:1 during an
  // edge-drag; the store clamps + persists.
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

  // Mirror of the sidebar, but the left edge grows the pane as it's dragged leftward (delta subtracted).
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
    return window.nexus.onBeginRename((path) => beginRename(path))
  }, [beginRename])

  // Dedup focuses an already-open tab instead of duplicating.
  useEffect(() => {
    return window.nexus.onOpenInNewTab((target) => {
      if (!target.id) return
      void select(contextTargetToSelect({ kind: target.kind, id: target.id, path: target.path }), {
        newTab: true,
      })
    })
  }, [select])

  const openPreview = useSession((s) => s.openPreview)
  useEffect(() => {
    return window.nexus.onOpenInPreview((target) => {
      if (target.id) openPreview({ id: target.id, path: target.path })
    })
  }, [openPreview])

  // Single-window v1: main guards stale pushes by session root; a rare in-flight push during a
  // nexus switch self-heals (the switch's own load() applies last).
  useEffect(() => {
    return window.nexus.onNexusChanged((next) => void applyTree(next))
  }, [applyTree])

  // Refreshes nav state only — no tree walk.
  useEffect(() => {
    return window.nexus.onNavChanged((nav) => applyNavChanged(nav))
  }, [applyNavChanged])

  useEffect(() => {
    return window.nexus.onMenuAction((action) => {
      switch (action) {
        case 'open':
          void choose()
          break
        case 'new-tab': {
          // ⌘N is a NATIVE accelerator (menu.ts) — a renderer keydown can't intercept it, so
          // the promote branch lives here.
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
      // A focused surface that claimed the chord keeps it (the editor's Mod-e = inline code).
      if (e.defaultPrevented) return
      if (matchesCommand(commands['toggle-ribbon'], e)) {
        e.preventDefault()
        toggleRibbon()
      } else if (matchesCommand(commands['toggle-nav'], e)) {
        e.preventDefault()
        toggleNav()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [commands, toggleRibbon, toggleNav])

  // The sidebar only "hides" when a nexus is open (its content is the tree). With
  // nothing open, the panel is the Open-Folder prompt — keep it visible so toggling
  // off an empty window can't strand the user with no on-screen affordance.
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
        <DetailPane />
      </main>
      {/* Always mounted so collapse/expand animates (slides) instead of snapping —
          .shell.sidebar-hidden translates it off. */}
      <Surface>
        {status === 'ready' && tree && <Ribbon />}
        <button
          type="button"
          className="sidebar-toggle sidebar-collapse"
          onClick={toggleSidebar}
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
        >
          <Icon name="log-out" size={18} className="flip-x" />
        </button>
        {status === 'loading' && <div className="state">Loading Nexus…</div>}
        {status === 'empty' && (
          <div className="state">
            No Nexus Open
            <button type="button" className="open-btn" onClick={() => void choose()}>
              Open Folder…
            </button>
          </div>
        )}
        {status === 'error' && (
          <div className="state state-error">
            Couldn’t Open Nexus
            <span className="state-detail">{error}</span>
          </div>
        )}
        {status === 'ready' && tree && <Sidebar tree={tree} />}
      </Surface>
      {/* A child of the frosted Surface can't carry a drag region (backdrop-filter swallows it),
          and draggable regions resolve in PAINT order, so the handle lives at shell level AFTER
          the Surface. */}
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
      {/* Always mounted (never conditionally rendered) so there's no in/out snap as the sidebar slides. */}
      <button
        type="button"
        className="sidebar-toggle sidebar-expand"
        onClick={toggleSidebar}
        aria-label="Show sidebar"
        title="Show sidebar"
      >
        <Icon name="log-out" size={18} />
      </button>
      {status === 'ready' && <InspectorPanel open={inspectorOpen} />}
      {status === 'ready' && <NavWindow />}
      {status === 'ready' && <PreviewWindow />}
      {status === 'ready' && <SettingsWindow />}
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
