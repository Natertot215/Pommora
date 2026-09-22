import {
  EMPTY_WINDOWS,
  type WindowSetRecord,
  type WindowsFile,
} from '@pommora/core/Interface/Windows/windowRecord'
import {
  isWindowTarget,
  type PageTarget,
  type SelectTarget,
  toNavRef,
  type WindowTarget,
} from '@pommora/core/Navigation/navRef'
import { type ReconcileIndex, reconcileWith } from './reconcileSelection'
import { reconcileIndexOf } from '../Nexus/treeIndex'
import { liveTarget, makeTabId } from '../Navigation/tabsModel'
import {
  activeTarget,
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
  pageWindow: WindowState | null
  windowsFile: WindowsFile
  windowSlide: { dir: 'back' | 'fwd'; seq: number } | null
  windowExit: 'dismiss' | 'engulf' | 'morph'
  historyTarget: PageTarget | null
  openHistory: (target: PageTarget) => void
  closeHistory: () => void
  openNavWindow: () => void
  openWindowTab: (target: WindowTarget, at?: number) => void
  activateWindowTab: (id: string) => void
  reorderWindowTabs: (activeId: string, overId: string) => void
  promoteWindowTab: (id: string, newTab?: boolean) => void
  closeWindowTab: (id: string, exit?: 'dismiss' | 'engulf') => void
  closeWindow: (reason?: 'dismiss' | 'engulf') => void
  openMatrixWindow: () => void
  toggleMatrixWindow: () => void
  navOpen: boolean
  openNav: () => void
  closeNav: () => void
  toggleNav: () => void
  /** The sequence makes every summon a distinct event, so re-clicking a link the window has navigated away from still re-aims it. */
  browserSummon: { url: string; seq: number } | null
  browserSeq: number
  openBrowser: (url: string) => void
  closeBrowser: () => void
  reconcileWindow: (index: ReconcileIndex) => void
  resetWindow: () => void
}

export const windowTargetOf = (s: SessionState): WindowTarget | null => activeTarget(s.pageWindow)

const PER_NEXUS = {
  navOpen: false,
  pageWindow: null,
  historyTarget: null,
  windowsFile: EMPTY_WINDOWS,
  windowSlide: null,
} satisfies Partial<WindowSlice>

export const createWindowSlice: Slice<WindowSlice> = (set, get) => {
  let windowSlideSeq = 0
  const stampByOrder = (cur: WindowState, nextId: string): { dir: 'back' | 'fwd'; seq: number } => {
    const from = cur.tabs.findIndex((t) => t.id === cur.activeTabId)
    const to = cur.tabs.findIndex((t) => t.id === nextId)
    return { dir: to < from ? 'back' : 'fwd', seq: ++windowSlideSeq }
  }

  // The map sentinel never persists; a restore lands on the tab that asked for the window, so the active tab is not stored.
  const toWindowRecord = (win: WindowState): WindowSetRecord => ({
    tabs: win.tabs
      .filter((t): t is WindowTab & { target: SelectTarget } => t.target.kind !== 'navwindow')
      .map((t) => ({ target: toNavRef(t.target) })),
  })

  const saveWindowsFile = (file: WindowsFile): void => {
    set({ windowsFile: file })
    scheduleWindowsSave(file)
  }

  const mirrorWindows = (): void => {
    const s = get()
    const win = s.pageWindow
    let file = s.windowsFile
    if (win) {
      switch (win.kind) {
        case 'nav':
          file = { ...file, navSet: toWindowRecord(win) }
          break
        case 'page':
          file = { ...file, pageSet: toWindowRecord(win) }
          break
        // The Matrix window carries no tabs, so there is no set to record — only that it stands.
        case 'matrix':
          break
      }
      file = { ...file, open: { kind: win.kind } }
    } else {
      file = { ...file, open: null }
    }
    saveWindowsFile(file)
  }

  const reconcileRecord = (rec: WindowSetRecord | null): WindowTab[] => {
    const tree = get().tree
    const index = rec && tree ? reconcileIndexOf(tree) : null
    if (!rec || !index) return []
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
    extra?: { windowSlide: ReturnType<typeof stampByOrder> },
  ): void => {
    set({ pageWindow: next, ...extra })
    mirrorWindows()
  }

  return {
    ...PER_NEXUS,
    windowExit: 'dismiss',
    openHistory: (target) => set({ historyTarget: target }),
    closeHistory: () => set({ historyTarget: null }),
    openNavWindow: () => {
      const cur = get().pageWindow
      if (cur?.kind === 'nav') return
      // A live Page Window morphs into the NavWindow rather than dismiss + fresh open — its rect is stashed for the nav's mount FLIP, and 'morph' hides the outgoing window instantly.
      const morphing = cur?.kind === 'page'
      if (morphing) stashWindowMorph()
      const sentinel = { id: makeTabId(), target: { kind: 'navwindow' as const } }
      const next: WindowState = {
        kind: 'nav',
        tabs: [sentinel, ...reconcileRecord(get().windowsFile.navSet)],
        activeTabId: sentinel.id,
      }
      clearWindowCache()
      set({ pageWindow: next, windowExit: morphing ? 'morph' : 'dismiss' })
      mirrorWindows()
    },
    openWindowTab: (target, at) => {
      const cur = get().pageWindow
      if (cur && cur.kind !== 'matrix') {
        const next = openTabIn(cur, makeTabId, target, at)
        if (next === cur) return
        if (at !== undefined) {
          commitWindow(next)
          return
        }
        const spawned = next.tabs.length > cur.tabs.length
        commitWindow(next, {
          windowSlide: spawned
            ? { dir: 'fwd', seq: ++windowSlideSeq }
            : stampByOrder(cur, next.activeTabId),
        })
        return
      }
      const restored: WindowState = {
        kind: 'page',
        tabs: reconcileRecord(get().windowsFile.pageSet),
        activeTabId: '',
      }
      clearWindowCache()
      // windowExit re-seeds on every open — only a close that writes 'engulf' plays the FLIP.
      set({
        pageWindow: openTabIn(restored, makeTabId, target),
        navOpen: false,
        windowExit: 'dismiss',
      })
      mirrorWindows()
    },
    activateWindowTab: (id) => {
      const cur = get().pageWindow
      if (!cur || cur.activeTabId === id || !cur.tabs.some((t) => t.id === id)) return
      const next = { ...cur, activeTabId: id }
      commitWindow(next, { windowSlide: stampByOrder(cur, id) })
    },
    reorderWindowTabs: (activeId, overId) => {
      const cur = get().pageWindow
      if (!cur) return
      const next = reorderTabIn(cur, activeId, overId)
      if (next === cur) return
      commitWindow(next)
    },
    promoteWindowTab: (id, newTab) => {
      const tab = get().pageWindow?.tabs.find((t) => t.id === id)
      if (!tab || tab.target.kind === 'navwindow') return
      get().closeWindowTab(id, 'engulf')
      void get().select(tab.target, newTab ? { newTab: true } : undefined)
    },
    closeWindowTab: (id, exit) => {
      const cur = get().pageWindow
      if (!cur) return
      const next = closeTabIn(cur, id)
      if (next === cur) return
      if (next === null) {
        clearWindowCache()
        // A hand-closed last tab must not come back; the X, which keeps the set, is the other half of that rule.
        set({ windowExit: exit ?? 'dismiss', windowsFile: { ...get().windowsFile, pageSet: null } })
      } else dropWindowCache(id)
      commitWindow(next)
    },
    closeWindow: (reason) => {
      clearWindowCache()
      set({ pageWindow: null, windowExit: reason ?? 'dismiss' })
      mirrorWindows()
    },
    openMatrixWindow: () => {
      if (get().pageWindow?.kind === 'matrix') return
      clearWindowCache()
      set({
        pageWindow: { kind: 'matrix', tabs: [], activeTabId: '' },
        navOpen: false,
        windowExit: 'dismiss',
      })
      mirrorWindows()
    },
    toggleMatrixWindow: () => {
      if (get().pageWindow?.kind === 'matrix') get().closeWindow()
      else get().openMatrixWindow()
    },

    openNav: () => {
      set({ navOpen: true })
      get().openNavWindow()
    },
    closeNav: () => {
      clearWindowCache()
      set({ navOpen: false, pageWindow: null })
      mirrorWindows()
    },
    toggleNav: () => {
      if (get().navOpen) get().closeNav()
      else get().openNav()
    },

    browserSummon: null,
    // Monotonic across closes: living outside the summon object, a re-summon inside the window's exit presence still reads as a new event.
    browserSeq: 0,
    openBrowser: (url) =>
      set((s) => {
        const seq = s.browserSeq + 1
        return { browserSeq: seq, browserSummon: { url, seq } }
      }),
    closeBrowser: () => set({ browserSummon: null }),

    // A deleted page's flush would hit a dead path, which the crud guard refuses.
    reconcileWindow: (index) => {
      const cur = get().pageWindow
      if (cur) {
        const deadIds: string[] = []
        const repath = new Map<string, string>()
        for (const t of cur.tabs) {
          if (t.target.kind === 'navwindow') continue
          const r = reconcileWith(index, t.target)
          if (r.kind === 'none') deadIds.push(t.id)
          else if (t.target.kind === 'page' && r.kind === 'page' && r.path !== t.target.path)
            repath.set(t.id, r.path)
        }
        if (deadIds.length > 0 || repath.size > 0) {
          for (const id of deadIds) dropWindowCache(id)
          let next: WindowState | null = cur
          for (const id of deadIds) next = next && closeTabIn(next, id)
          if (next && repath.size > 0)
            next = {
              ...next,
              tabs: next.tabs.map((t) => {
                const path = repath.get(t.id)
                return path && t.target.kind === 'page'
                  ? { ...t, target: { ...t.target, path } }
                  : t
              }),
            }
          commitWindow(next)
        }
      }
      const history = get().historyTarget
      if (history && reconcileWith(index, history).kind === 'none') set({ historyTarget: null })
    },

    resetWindow: () => {
      set(PER_NEXUS)
      clearWindowCache()
    },
  }
}
