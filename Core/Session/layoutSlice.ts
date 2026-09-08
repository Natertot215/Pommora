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

export const SIDEBAR_WIDTH = { min: 180, max: 380, def: 240 }
export const INSPECTOR_WIDTH = { min: 240, max: 420, def: 300 }
type PaneWidth = typeof SIDEBAR_WIDTH

export const clampWidth = (pane: PaneWidth, w: number): number =>
  clamp(Math.round(w), pane.min, pane.max)

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

    setSidebarWidth: (w) => set({ sidebarWidth: clampWidth(SIDEBAR_WIDTH, w) }),
    setInspectorWidth: (w) => set({ inspectorWidth: clampWidth(INSPECTOR_WIDTH, w) }),
    persistPaneWidths: () => {
      const s = get()
      s.setDevicePref('panes', { sidebar: s.sidebarWidth, inspector: s.inspectorWidth })
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
