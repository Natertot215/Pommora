import type { NavViewMode } from '@pommora/core/Interface/chrome'
import type { Slice } from './sessionState'
import { clamp } from '@pommora/uix/Utilities/clamp'
import { host } from '../Platform/dialer'

export interface LayoutSlice {
  sidebarVisible: boolean
  toggleSidebar: () => void
  ribbonVisible: boolean
  toggleRibbon: () => void
  sidebarWidth: number
  setSidebarWidth: (w: number) => void
  persistPaneWidths: () => void
  inspectorWidth: number
  setInspectorWidth: (w: number) => void
  subfieldExpanded: boolean
  setSubfieldExpanded: (expanded: boolean) => void
  navWindowMode: NavViewMode
  setNavWindowMode: (mode: NavViewMode) => void
  navViewMode: NavViewMode
  setNavViewMode: (mode: NavViewMode) => void
  settingsOpen: boolean
  closeSettings: () => void
  toggleSettings: () => void
  iterationOpen: boolean
  closeIteration: () => void
  toggleIteration: () => void
  resetLayout: () => void
}

// Pane widths live in localStorage rather than nexus.db: an IPC round trip per drag frame is what storing them main-side would cost (Nathan's call).
export const SIDEBAR_WIDTH = { min: 180, max: 380, def: 240, key: 'pommora.sidebarWidth' }
export const INSPECTOR_WIDTH = { min: 240, max: 420, def: 300, key: 'pommora.inspectorWidth' }
type PaneWidth = typeof SIDEBAR_WIDTH

export const clampWidth = (pane: PaneWidth, w: number): number =>
  clamp(Math.round(w), pane.min, pane.max)

function storedWidth(pane: PaneWidth): number {
  try {
    const n = Number(localStorage.getItem(pane.key))
    return Number.isFinite(n) && n > 0 ? clampWidth(pane, n) : pane.def
  } catch {
    return pane.def
  }
}

// devicePrefs is bound to a session root, so a pane width belongs to this Nexus and returns to its default when another one opens.
const PER_NEXUS = {
  sidebarWidth: SIDEBAR_WIDTH.def,
  inspectorWidth: INSPECTOR_WIDTH.def,
  subfieldExpanded: true,
  navWindowMode: 'list',
  navViewMode: 'list',
} satisfies Partial<LayoutSlice>

export const createLayoutSlice: Slice<LayoutSlice> = (set, get) => {
  const persistSubfield = (): void => {
    const s = get()
    void host().ask('subfield:set', { expanded: s.subfieldExpanded })
  }

  const persistNavModes = (): void => {
    const s = get()
    void host().ask('navViewModes:set', { window: s.navWindowMode, view: s.navViewMode })
  }

  return {
    ...PER_NEXUS,
    sidebarVisible: true,
    toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
    ribbonVisible: true,
    toggleRibbon: () => set((s) => ({ ribbonVisible: !s.ribbonVisible })),

    sidebarWidth: storedWidth(SIDEBAR_WIDTH),
    setSidebarWidth: (w) => set({ sidebarWidth: clampWidth(SIDEBAR_WIDTH, w) }),
    inspectorWidth: storedWidth(INSPECTOR_WIDTH),
    setInspectorWidth: (w) => set({ inspectorWidth: clampWidth(INSPECTOR_WIDTH, w) }),
    persistPaneWidths: () => {
      try {
        localStorage.setItem(SIDEBAR_WIDTH.key, String(get().sidebarWidth))
        localStorage.setItem(INSPECTOR_WIDTH.key, String(get().inspectorWidth))
      } catch {}
    },

    setSubfieldExpanded: (expanded) => {
      set({ subfieldExpanded: expanded })
      persistSubfield()
    },
    setNavWindowMode: (mode) => {
      set({ navWindowMode: mode })
      persistNavModes()
    },
    setNavViewMode: (mode) => {
      set({ navViewMode: mode })
      persistNavModes()
    },

    settingsOpen: false,
    closeSettings: () => set({ settingsOpen: false }),
    toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),

    iterationOpen: false,
    closeIteration: () => set({ iterationOpen: false }),
    toggleIteration: () => set((s) => ({ iterationOpen: !s.iterationOpen })),

    resetLayout: () => set({ ...PER_NEXUS }),
  }
}
