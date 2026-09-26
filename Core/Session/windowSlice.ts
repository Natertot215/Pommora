import {
  EMPTY_WINDOWS,
  type WindowSetRecord,
  type WindowsFile,
} from '@pommora/core/Interface/Windows/windowRecord'
import {
  isWindowTarget,
  type PageTarget,
  toNavRef,
  type WindowTarget,
} from '@pommora/core/Navigation/navRef'
import { type ReconcileIndex, reconcileHeld, reconcileWith } from './reconcileSelection'
import { reconcileIndexOf } from '../Nexus/treeIndex'
import { liveTarget, makeTabId } from '../Navigation/tabsModel'
import {
  closeTabIn,
  openTabIn,
  type WindowState,
  type WindowTab,
  reorderTabIn,
} from '../Interface/Windows/windowTabs'
import { clearWindowCache, dropWindowCache } from '../Interface/Windows/windowCache'
import { stashWindowMorph } from '../Interface/Windows/windowMorph'
import type { SessionState, Slice } from './sessionState'
import { scheduleWindowsSave } from './saveScheduler'

export interface WindowSlice {
  windowSlot: WindowState | null
  windowsFile: WindowsFile
  windowSlide: { dir: 'back' | 'fwd'; seq: number } | null
  windowExit: 'dismiss' | 'engulf' | 'morph'
  windowSummon: number
  historyTarget: PageTarget | null
  openHistory: (target: PageTarget) => void
  closeHistory: () => void
  openWindowTab: (target: WindowTarget, opts?: { at?: number; heading?: string }) => void
  activateWindowTab: (id: string) => void
  reorderWindowTabs: (activeId: string, overId: string) => void
  promoteWindowTab: (id: string, newTab?: boolean) => void
  closeWindowTab: (id: string, exit?: 'dismiss' | 'engulf') => void
  closeWindow: (reason?: 'dismiss' | 'engulf') => void
  openMatrixWindow: () => void
  toggleMatrixWindow: () => void
  openNav: () => void
  toggleNav: () => void
  /** The sequence makes every summon a distinct event, so re-clicking a link the window has navigated away from still re-aims it. */
  browserSummon: { url: string; seq: number } | null
  openBrowser: (url: string) => void
  closeBrowser: () => void
  settingsOpen: boolean
  closeSettings: () => void
  toggleSettings: () => void
  iterationOpen: boolean
  closeIteration: () => void
  toggleIteration: () => void
  closeWindows: () => void
  reconcileWindow: (index: ReconcileIndex) => void
  resetWindow: () => void
}

export const windowTargetOf = (s: SessionState): WindowTarget | null => {
  const win = s.windowSlot
  const active = win?.tabs.find((t) => t.id === win.activeTabId)
  return active && isWindowTarget(active.target) ? active.target : null
}

export const windowsOpen = (s: SessionState): boolean =>
  s.windowSlot !== null ||
  s.historyTarget !== null ||
  s.browserSummon !== null ||
  s.settingsOpen ||
  s.iterationOpen

const CLOSED = {
  windowSlot: null,
  historyTarget: null,
  browserSummon: null,
  settingsOpen: false,
  iterationOpen: false,
} satisfies Partial<WindowSlice>

const PER_NEXUS = {
  ...CLOSED,
  windowsFile: EMPTY_WINDOWS,
  windowSlide: null,
  windowSummon: 0,
} satisfies Partial<WindowSlice>

export const createWindowSlice: Slice<WindowSlice> = (set, get) => {
  let windowSlideSeq = 0
  let browserSeq = 0
  const stampByOrder = (cur: WindowState, nextId: string): { dir: 'back' | 'fwd'; seq: number } => {
    const from = cur.tabs.findIndex((t) => t.id === cur.activeTabId)
    const to = cur.tabs.findIndex((t) => t.id === nextId)
    return { dir: to < from ? 'back' : 'fwd', seq: ++windowSlideSeq }
  }

  // The map sentinel never persists; a restore lands on the tab that asked for the window, so the active tab is not stored.
  const toWindowRecord = (win: WindowState): WindowSetRecord => ({
    tabs: win.tabs.flatMap((t) =>
      isWindowTarget(t.target) ? [{ target: toNavRef(t.target) }] : [],
    ),
  })

  const reconcileRecord = (rec: WindowSetRecord | null | undefined): WindowTab[] => {
    const tree = get().tree
    if (!rec || !tree) return []
    const index = reconcileIndexOf(tree)
    const seen = new Set<string>()
    const tabs: WindowTab[] = []
    for (const t of rec.tabs) {
      const target = liveTarget(index, t.target)
      if (!target || !isWindowTarget(target)) continue
      if (seen.has(target.id)) continue
      seen.add(target.id)
      tabs.push({ id: makeTabId(), target })
    }
    return tabs
  }

  const commitWindow = (
    next: WindowState | null,
    extra?: Partial<
      Pick<WindowSlice, 'windowSlide' | 'windowExit' | 'windowSummon' | 'windowsFile'>
    >,
  ): void => {
    const { windowSlot: cur, windowsFile: file } = get()
    if (next === null || next.kind !== cur?.kind) clearWindowCache()
    const windowsFile =
      extra?.windowsFile ??
      (next && next.kind !== 'matrix' && next.tabs !== cur?.tabs
        ? { sets: { ...file.sets, [next.kind]: toWindowRecord(next) } }
        : file)
    set({ windowSlot: next, ...extra, windowsFile })
    if (windowsFile !== file) scheduleWindowsSave(windowsFile)
  }

  return {
    ...PER_NEXUS,
    windowExit: 'dismiss',
    openHistory: (target) => set({ historyTarget: target }),
    closeHistory: () => set({ historyTarget: null }),
    openWindowTab: (target, { at, heading } = {}) => {
      if (heading && target.kind === 'page')
        set({ pendingTravel: { route: 'window', path: target.path, heading } })
      const windowSummon = get().windowSummon + 1
      const cur = get().windowSlot
      if (cur && cur.kind !== 'matrix') {
        const next = openTabIn(cur, makeTabId, target, at)
        if (next === cur) {
          set({ windowSummon })
          return
        }
        if (at !== undefined) {
          commitWindow(next, { windowSummon })
          return
        }
        const spawned = next.tabs.length > cur.tabs.length
        commitWindow(next, {
          windowSummon,
          windowSlide: spawned
            ? { dir: 'fwd', seq: ++windowSlideSeq }
            : stampByOrder(cur, next.activeTabId),
        })
        return
      }
      const restored: WindowState = {
        kind: 'page',
        tabs: reconcileRecord(get().windowsFile.sets.page),
        activeTabId: '',
      }
      // windowExit re-seeds on every open — only a close that writes 'engulf' plays the FLIP.
      commitWindow(openTabIn(restored, makeTabId, target), { windowExit: 'dismiss', windowSummon })
    },
    activateWindowTab: (id) => {
      const cur = get().windowSlot
      if (!cur || cur.activeTabId === id || !cur.tabs.some((t) => t.id === id)) return
      commitWindow({ ...cur, activeTabId: id }, { windowSlide: stampByOrder(cur, id) })
    },
    reorderWindowTabs: (activeId, overId) => {
      const cur = get().windowSlot
      if (!cur) return
      const next = reorderTabIn(cur, activeId, overId)
      if (next === cur) return
      commitWindow(next)
    },
    promoteWindowTab: (id, newTab) => {
      const s = get()
      const tab = s.windowSlot?.tabs.find((t) => t.id === id)
      if (!tab) return
      if (tab.target.kind === 'map') {
        // The map tab has no entity to promote: the list itself carries into a new app tab.
        s.setDevicePref('navViewGallery', s.devicePrefs.navWindowGallery === true)
        s.closeWindow()
        s.openNewTab()
        return
      }
      s.closeWindowTab(id, 'engulf')
      void s.select(tab.target, newTab ? { newTab: true } : undefined)
    },
    closeWindowTab: (id, exit) => {
      const cur = get().windowSlot
      if (!cur) return
      const next = closeTabIn(cur, id)
      if (next === cur) return
      if (next) {
        dropWindowCache(id)
        commitWindow(next)
        return
      }
      // A hand-closed last tab must not come back; the X, which keeps the set, is the other half of that rule.
      commitWindow(null, {
        windowExit: exit ?? 'dismiss',
        windowsFile: { sets: { ...get().windowsFile.sets, [cur.kind]: null } },
      })
    },
    closeWindow: (reason) => commitWindow(null, { windowExit: reason ?? 'dismiss' }),
    openMatrixWindow: () => {
      if (get().windowSlot?.kind === 'matrix') return
      commitWindow({ kind: 'matrix', tabs: [], activeTabId: '' }, { windowExit: 'dismiss' })
    },
    toggleMatrixWindow: () => {
      if (get().windowSlot?.kind === 'matrix') get().closeWindow()
      else get().openMatrixWindow()
    },
    openNav: () => {
      const cur = get().windowSlot
      if (cur?.kind === 'nav') return
      // A live Page Window morphs into the NavWindow rather than dismiss + fresh open — its rect is stashed for the nav's mount FLIP, and 'morph' hides the outgoing window instantly.
      const morphing = cur?.kind === 'page'
      if (morphing) stashWindowMorph()
      const sentinel = { id: makeTabId(), target: { kind: 'map' as const } }
      commitWindow(
        {
          kind: 'nav',
          tabs: [sentinel, ...reconcileRecord(get().windowsFile.sets.nav)],
          activeTabId: sentinel.id,
        },
        { windowExit: morphing ? 'morph' : 'dismiss' },
      )
    },
    toggleNav: () => {
      if (get().windowSlot?.kind === 'nav') get().closeWindow()
      else get().openNav()
    },

    // Monotonic across closes: living outside the summon object, a re-summon inside the window's exit presence still reads as a new event.
    openBrowser: (url) => set({ browserSummon: { url, seq: ++browserSeq } }),
    closeBrowser: () => set({ browserSummon: null }),

    closeSettings: () => set({ settingsOpen: false }),
    toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),
    closeIteration: () => set({ iterationOpen: false }),
    toggleIteration: () => set((s) => ({ iterationOpen: !s.iterationOpen })),

    closeWindows: () => {
      clearWindowCache()
      set(CLOSED)
    },

    // A deleted page's flush would hit a dead path, which the crud guard refuses.
    reconcileWindow: (index) => {
      const cur = get().windowSlot
      if (cur) {
        const { next: tabs, dropped } = reconcileHeld(cur.tabs, (t) => {
          if (t.target.kind === 'map') return t
          const r = reconcileWith(index, t.target)
          return !isWindowTarget(r) ? null : r === t.target ? t : { ...t, target: r }
        })
        if (tabs !== cur.tabs) {
          for (const t of dropped) dropWindowCache(t.id)
          let closed: WindowState | null = cur
          for (const t of dropped) closed = closed && closeTabIn(closed, t.id)
          commitWindow(closed && { ...closed, tabs })
        }
      }
      const history = get().historyTarget
      const r = history && reconcileWith(index, history)
      if (r && r !== history) set({ historyTarget: r.kind === 'page' ? r : null })
    },

    resetWindow: () => {
      clearWindowCache()
      set(PER_NEXUS)
    },
  }
}
