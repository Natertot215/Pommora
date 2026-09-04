import type { NavViewMode, SelectionState } from '@shared/types'
import type { ConfirmRequest } from '@renderer/Windows/confirmations'
import type { Notification } from '@renderer/Interface/notifications'
import type { Slice } from './sessionState'

export interface ChromeSlice {
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
  iterationOpen: boolean
  closeIteration: () => void
  toggleIteration: () => void
  pendingConfirm: { req: ConfirmRequest; settle: (confirmed: boolean) => void } | null
  askConfirm: (req: ConfirmRequest) => Promise<boolean>
  notification: (Notification & { id: number }) | null
  notify: (n: Notification) => void
  dismissNotification: (id: number) => void
  resetChrome: () => void
}

export const SIDEBAR_WIDTH = { min: 180, max: 380 }
const SIDEBAR_DEFAULT = 240
const SIDEBAR_WIDTH_KEY = 'pommora.sidebarWidth'
const clampSidebar = (w: number): number =>
  Math.max(SIDEBAR_WIDTH.min, Math.min(SIDEBAR_WIDTH.max, Math.round(w)))
function readStoredSidebarWidth(): number {
  try {
    const n = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY))
    return Number.isFinite(n) && n > 0 ? clampSidebar(n) : SIDEBAR_DEFAULT
  } catch {
    return SIDEBAR_DEFAULT
  }
}

export const INSPECTOR_WIDTH = { min: 240, max: 420 }
const INSPECTOR_DEFAULT = 300
const INSPECTOR_WIDTH_KEY = 'pommora.inspectorWidth'
const clampInspector = (w: number): number =>
  Math.max(INSPECTOR_WIDTH.min, Math.min(INSPECTOR_WIDTH.max, Math.round(w)))
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

let notificationSeq = 0

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

    iterationOpen: false,
    closeIteration: () => set({ iterationOpen: false }),
    toggleIteration: () => set((s) => ({ iterationOpen: !s.iterationOpen })),

    pendingConfirm: null,
    askConfirm: (req) =>
      new Promise((resolve) => {
        get().pendingConfirm?.settle(false)
        // Identity-guarded: a question that was already displaced must not take down the one
        // standing in its place.
        const settle = (confirmed: boolean): void => {
          set((s) => (s.pendingConfirm?.settle === settle ? { pendingConfirm: null } : {}))
          resolve(confirmed)
        }
        set({ pendingConfirm: { req, settle } })
      }),

    notification: null,
    notify: (n) => set({ notification: { ...n, id: ++notificationSeq } }),
    dismissNotification: (id) =>
      set((s) => (s.notification?.id === id ? { notification: null } : {})),

    resetChrome: () => {
      get().pendingConfirm?.settle(false)
      set({ ...PER_NEXUS, pendingConfirm: null, notification: null })
    },
  }
}
