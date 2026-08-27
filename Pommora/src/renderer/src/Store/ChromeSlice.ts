import { DEFAULT_COMMANDS, type NavViewMode, type SelectionState } from '@shared/types'
import type { Slice } from './SessionState'

/** The window's furniture — pane widths and visibility, the footer's disclosure and order, the
 *  nav window's view modes, the settings window. */
export interface ChromeSlice {
  sidebarVisible: boolean
  toggleSidebar: () => void
  ribbonVisible: boolean
  toggleRibbon: () => void
  commands: Record<string, string>
  sidebarWidth: number
  setSidebarWidth: (w: number) => void
  /** Called once on resize-release, never per pointermove — a synchronous localStorage write per
   *  move is the drag-stutter source. */
  persistPaneWidths: () => void
  inspectorWidth: number
  setInspectorWidth: (w: number) => void
  subfieldExpanded: boolean
  setSubfieldExpanded: (expanded: boolean) => void
  subfieldOrder: Partial<Record<SelectionState['kind'], string[]>>
  setSubfieldOrder: (kind: SelectionState['kind'], ids: string[]) => void
  navWindowMode: NavViewMode
  setNavWindowMode: (mode: NavViewMode) => void
  navViewMode: NavViewMode
  setNavViewMode: (mode: NavViewMode) => void
  settingsOpen: boolean
  openSettings: () => void
  closeSettings: () => void
  toggleSettings: () => void
  /** The per-nexus furniture back to its defaults, so a nexus without the setting can't inherit
   *  the previous one's. */
  resetChrome: () => void
}

const SIDEBAR_MIN = 180
const SIDEBAR_MAX = 380
const SIDEBAR_DEFAULT = 240
const SIDEBAR_WIDTH_KEY = 'pommora.sidebarWidth'
const clampSidebar = (w: number): number =>
  Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, Math.round(w)))
function readStoredSidebarWidth(): number {
  try {
    const n = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY))
    return Number.isFinite(n) && n > 0 ? clampSidebar(n) : SIDEBAR_DEFAULT
  } catch {
    return SIDEBAR_DEFAULT
  }
}

const INSPECTOR_MIN = 240
const INSPECTOR_MAX = 420
const INSPECTOR_DEFAULT = 300
const INSPECTOR_WIDTH_KEY = 'pommora.inspectorWidth'
const clampInspector = (w: number): number =>
  Math.max(INSPECTOR_MIN, Math.min(INSPECTOR_MAX, Math.round(w)))
function readStoredInspectorWidth(): number {
  try {
    const n = Number(localStorage.getItem(INSPECTOR_WIDTH_KEY))
    return Number.isFinite(n) && n > 0 ? clampInspector(n) : INSPECTOR_DEFAULT
  } catch {
    return INSPECTOR_DEFAULT
  }
}

const PER_NEXUS = {
  subfieldExpanded: true,
  subfieldOrder: {},
  navWindowMode: 'list',
  navViewMode: 'list',
} satisfies Partial<ChromeSlice>

export const createChromeSlice: Slice<ChromeSlice> = (set, get) => {
  const persistSubfield = (): void => {
    const s = get()
    void window.nexus.subfield
      .set({ order: s.subfieldOrder, expanded: s.subfieldExpanded })
      .catch(() => undefined)
  }

  const persistNavModes = (): void => {
    const s = get()
    void window.nexus.navViewModes
      .set({ window: s.navWindowMode, view: s.navViewMode })
      .catch(() => undefined)
  }

  return {
    sidebarVisible: true,
    toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
    ribbonVisible: true,
    toggleRibbon: () => set((s) => ({ ribbonVisible: !s.ribbonVisible })),
    commands: DEFAULT_COMMANDS,

    sidebarWidth: readStoredSidebarWidth(),
    setSidebarWidth: (w) => set({ sidebarWidth: clampSidebar(w) }),
    inspectorWidth: readStoredInspectorWidth(),
    setInspectorWidth: (w) => set({ inspectorWidth: clampInspector(w) }),
    persistPaneWidths: () => {
      try {
        localStorage.setItem(SIDEBAR_WIDTH_KEY, String(get().sidebarWidth))
        localStorage.setItem(INSPECTOR_WIDTH_KEY, String(get().inspectorWidth))
      } catch {
        // widths just won't persist
      }
    },

    ...PER_NEXUS,
    setSubfieldExpanded: (expanded) => {
      set({ subfieldExpanded: expanded })
      persistSubfield()
    },
    setSubfieldOrder: (kind, ids) => {
      set((s) => ({ subfieldOrder: { ...s.subfieldOrder, [kind]: ids } }))
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
    openSettings: () => set({ settingsOpen: true }),
    closeSettings: () => set({ settingsOpen: false }),
    toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),

    resetChrome: () => set(PER_NEXUS),
  }
}
