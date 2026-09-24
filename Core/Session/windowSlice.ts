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
import { type ReconcileIndex, reconcileWith } from './reconcileSelection'
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
  openBrowser: (url: string) => void
  closeBrowser: () => void
  reconcileWindow: (index: ReconcileIndex) => void
  resetWindow: () => void
}

export const windowTargetOf = (s: SessionState): WindowTarget | null => {
  const win = s.pageWindow
  const active = win?.tabs.find((t) => t.id === win.activeTabId)
  return active && isWindowTarget(active.target) ? active.target : null
}

const PER_NEXUS = {
  navOpen: false,
  pageWindow: null,
  historyTarget: null,
  windowsFile: EMPTY_WINDOWS,
  windowSlide: null,
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

  const saveWindowsFile = (file: WindowsFile): void => {
    set({ windowsFile: file })
    scheduleWindowsSave(file)
  }

  const mirrorWindows = (): void => {
    const { pageWindow: win, windowsFile: file } = get()
    // The Matrix window carries no tabs, and a closed window leaves the sets as they stand.
    saveWindowsFile(
      win?.kind === 'nav'
        ? { ...file, navSet: toWindowRecord(win) }
        : win?.kind === 'page'
          ? { ...file, pageSet: toWindowRecord(win) }
          : file,
    )
  }

  const reconcileRecord = (rec: WindowSetRecord | null): WindowTab[] => {
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
    extra?: Partial<Pick<WindowSlice, 'windowSlide' | 'navOpen' | 'windowExit'>>,
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
      commitWindow(next, { windowExit: morphing ? 'morph' : 'dismiss' })
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
      commitWindow(openTabIn(restored, makeTabId, target), {
        navOpen: false,
        windowExit: 'dismiss',
      })
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
      commitWindow(null, { windowExit: reason ?? 'dismiss' })
    },
    openMatrixWindow: () => {
      if (get().pageWindow?.kind === 'matrix') return
      clearWindowCache()
      commitWindow(
        { kind: 'matrix', tabs: [], activeTabId: '' },
        { navOpen: false, windowExit: 'dismiss' },
      )
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
      commitWindow(null, { navOpen: false })
    },
    toggleNav: () => {
      if (get().navOpen) get().closeNav()
      else get().openNav()
    },

    browserSummon: null,
    // Monotonic across closes: living outside the summon object, a re-summon inside the window's exit presence still reads as a new event.
    openBrowser: (url) => set({ browserSummon: { url, seq: ++browserSeq } }),
    closeBrowser: () => set({ browserSummon: null }),

    // A deleted page's flush would hit a dead path, which the crud guard refuses.
    reconcileWindow: (index) => {
      const cur = get().pageWindow
      if (cur) {
        const deadIds: string[] = []
        const retarget = new Map<string, PageTarget>()
        for (const t of cur.tabs) {
          if (t.target.kind === 'navwindow') continue
          const r = reconcileWith(index, t.target)
          if (r.kind === 'none') deadIds.push(t.id)
          else if (r.kind === 'page' && r !== t.target) retarget.set(t.id, r)
        }
        if (deadIds.length > 0 || retarget.size > 0) {
          for (const id of deadIds) dropWindowCache(id)
          let next: WindowState | null = cur
          for (const id of deadIds) next = next && closeTabIn(next, id)
          if (next && retarget.size > 0)
            next = {
              ...next,
              tabs: next.tabs.map((t) => {
                const target = retarget.get(t.id)
                return target ? { ...t, target } : t
              }),
            }
          commitWindow(next)
        }
      }
      const history = get().historyTarget
      const r = history && reconcileWith(index, history)
      if (r && r !== history) set({ historyTarget: r.kind === 'page' ? r : null })
    },

    resetWindow: () => {
      set(PER_NEXUS)
      clearWindowCache()
    },
  }
}
