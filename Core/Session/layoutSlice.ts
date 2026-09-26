import type { HostPlatform } from '@pommora/core/Contract/bridge'
import type { Slice } from './sessionState'
import { clamp } from '@pommora/uix/Utilities/clamp'

export interface LayoutSlice {
  sidebarVisible: boolean
  toggleSidebar: () => void
  ribbonVisible: boolean
  toggleRibbon: () => void
  sidebarWidth: number
  setSidebarWidth: (w: number) => void
  persistPaneWidths: () => void
  sidePaneWidth: number
  setSidePaneWidth: (w: number) => void
  hostPlatform: HostPlatform
  fullscreen: boolean
  setHostWindow: (host: Partial<Pick<LayoutSlice, 'hostPlatform' | 'fullscreen'>>) => void
  resetLayout: () => void
}

export const SIDEBAR_WIDTH = { min: 180, max: 380, def: 240 }
export const SIDE_PANE_WIDTH = { min: 240, max: 420, def: 300 }
type PaneWidth = typeof SIDEBAR_WIDTH

export const clampWidth = (pane: PaneWidth, w: number): number =>
  clamp(Math.round(w), pane.min, pane.max)

// devicePrefs is bound to a session root, so a pane width belongs to this Nexus and returns to its default when another one opens.
const PER_NEXUS = {
  sidebarWidth: SIDEBAR_WIDTH.def,
  sidePaneWidth: SIDE_PANE_WIDTH.def,
} satisfies Partial<LayoutSlice>

export const createLayoutSlice: Slice<LayoutSlice> = (set, get) => ({
  ...PER_NEXUS,
  sidebarVisible: true,
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  ribbonVisible: true,
  toggleRibbon: () => set((s) => ({ ribbonVisible: !s.ribbonVisible })),

  setSidebarWidth: (w) => set({ sidebarWidth: clampWidth(SIDEBAR_WIDTH, w) }),
  setSidePaneWidth: (w) => set({ sidePaneWidth: clampWidth(SIDE_PANE_WIDTH, w) }),
  persistPaneWidths: () => {
    const s = get()
    s.setDevicePref('panes', { sidebar: s.sidebarWidth, sidePane: s.sidePaneWidth })
  },

  hostPlatform: 'posix',
  fullscreen: false,
  setHostWindow: (host) => set(host),

  resetLayout: () => set({ ...PER_NEXUS }),
})
