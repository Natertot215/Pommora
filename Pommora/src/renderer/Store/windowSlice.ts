import {
  EMPTY_WINDOWS,
  type WindowSetRecord,
  type WindowsFile,
  type SelectTarget,
  toNavRef,
} from '@shared/types'
import { type ReconcileIndex, reconcileWith } from '@renderer/Actions/selection'
import { reconcileIndexOf } from '../treeIndex'
import { liveTarget, makeTabId } from '../Tabs/tabsModel'
import {
  closeTabIn,
  deriveTarget,
  openTabIn,
  type WindowState,
  type WindowTab,
  reorderTabIn,
} from '../Windows/windowTabs'
import { clearWindowCache, dropWindowCache } from '../Windows/windowCache'
import { stashWindowMorph } from '../Windows/windowMorph'
import type { SessionState, Slice } from './sessionState'

export type WindowTarget = { id: string; path: string }

export interface WindowSlice {
  pageWindow: WindowState | null
  windowsFile: WindowsFile
  windowSlide: { dir: 'back' | 'fwd'; seq: number } | null
  windowExit: 'dismiss' | 'engulf' | 'morph'
  openWindow: (target: WindowTarget) => void
  /** The page whose history window is open; null = closed. */
  historyTarget: WindowTarget | null
  openHistory: (target: WindowTarget) => void
  closeHistory: () => void
  openNavWindow: () => void
  openWindowTab: (target: WindowTarget) => void
  activateWindowTab: (id: string) => void
  reorderWindowTabs: (activeId: string, overId: string) => void
  closeWindowTab: (id: string, exit?: 'dismiss' | 'engulf') => void
  closeWindow: (reason?: 'dismiss' | 'engulf') => void
  setNavOverride: (on: boolean) => void
  navOpen: boolean
  openNav: () => void
  closeNav: () => void
  toggleNav: () => void
  /** The in-app browser's summoned address; null = closed. The sequence makes every summon a
   *  distinct event, so re-clicking a link the window has navigated away from still re-aims it. */
  browserSummon: { url: string; seq: number } | null
  browserSeq: number
  openBrowser: (url: string) => void
  closeBrowser: () => void
  reconcileWindow: (index: ReconcileIndex) => void
  resetWindow: () => void
}

export const windowTargetOf = (s: SessionState): WindowTarget | null => deriveTarget(s.pageWindow)

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

  // The gallery sentinel never persists — only the page tabs write, and activeIndex counts by
  // the stored (page-only) order.
  const toWindowRecord = (p: WindowState): WindowSetRecord => {
    const pages = p.tabs.filter(
      (t): t is WindowTab & { target: SelectTarget } => t.target.kind !== 'navwindow',
    )
    return {
      tabs: pages.map((t) => ({ target: toNavRef(t.target) })),
      activeIndex: Math.max(
        0,
        pages.findIndex((t) => t.id === p.activeTabId),
      ),
    }
  }

  const saveWindowsFile = (file: WindowsFile): void => {
    set({ windowsFile: file })
    void (window as { nexus?: typeof window.nexus }).nexus?.windows
      ?.save(file)
      .catch(() => undefined)
  }

  const mirrorWindows = (retire?: string): void => {
    const s = get()
    const p = s.pageWindow
    let file = s.windowsFile
    if (retire && retire !== p?.originId) {
      const { [retire]: _dropped, ...origins } = file.origins
      file = { ...file, origins }
    }
    if (p) {
      const rec = toWindowRecord(p)
      file =
        p.flavor === 'nav'
          ? { ...file, navSet: rec, open: { flavor: 'nav', originId: p.originId } }
          : {
              ...file,
              origins: { ...file.origins, [p.originId]: rec },
              open: { flavor: 'page', originId: p.originId },
            }
    } else {
      file = { ...file, open: null }
    }
    saveWindowsFile(file)
  }

  const reconcileRecord = (
    rec: WindowSetRecord | null | undefined,
  ): { tabs: WindowTab[]; activeTab: WindowTab | null } => {
    if (!rec) return { tabs: [], activeTab: null }
    const tree = get().tree
    const index = tree ? reconcileIndexOf(tree) : null
    const seen = new Set<string>()
    const tabs: WindowTab[] = []
    let activeTab: WindowTab | null = null
    rec.tabs.forEach((t, i) => {
      if (t.target.kind !== 'page' || !index) return
      const target = liveTarget(index, t.target)
      if (target?.kind !== 'page') return
      if (seen.has(target.id)) return
      seen.add(target.id)
      const tab = { id: makeTabId(), target }
      tabs.push(tab)
      if (i === rec.activeIndex) activeTab = tab
    })
    return { tabs, activeTab }
  }

  const commitWindow = (
    next: WindowState | null,
    extra?: { windowSlide: ReturnType<typeof stampByOrder> },
  ): void => {
    const prev = get().pageWindow
    set({ pageWindow: next, ...extra })
    const retire =
      prev && prev.flavor === 'page' && prev.originId !== next?.originId ? prev.originId : undefined
    mirrorWindows(retire)
  }

  return {
    ...PER_NEXUS,
    windowExit: 'dismiss',
    openHistory: (target) => set({ historyTarget: target }),
    closeHistory: () => set({ historyTarget: null }),
    openWindow: (target) => {
      const cur = get().pageWindow
      if (cur?.flavor === 'page' && cur.originId === target.id) return
      const { tabs: restored, activeTab } = reconcileRecord(get().windowsFile.origins[target.id])
      const tabs =
        restored.length > 0
          ? restored
          : [{ id: makeTabId(), target: { kind: 'page' as const, ...target } }]
      const pageWindow: WindowState = {
        flavor: 'page',
        originId: target.id,
        tabs,
        activeTabId: (activeTab ?? tabs[0]).id,
      }
      clearWindowCache()
      // windowExit re-seeds on every open — only a close that writes 'engulf' plays the FLIP.
      set({ pageWindow, navOpen: false, windowExit: 'dismiss' })
      mirrorWindows()
    },
    openNavWindow: () => {
      const cur = get().pageWindow
      if (cur?.flavor === 'nav') return
      // A live Page Window morphs into the NavWindow rather than dismiss + fresh open — its
      // rect is stashed for the nav's mount FLIP, and 'morph' hides the outgoing window instantly.
      const morphing = cur?.flavor === 'page'
      if (morphing) stashWindowMorph()
      const { tabs: pages } = reconcileRecord(get().windowsFile.navSet)
      const sentinel = { id: makeTabId(), target: { kind: 'navwindow' as const } }
      const pageWindow: WindowState = {
        flavor: 'nav',
        originId: 'navwindow',
        tabs: [sentinel, ...pages],
        activeTabId: sentinel.id,
      }
      clearWindowCache()
      set({ pageWindow, windowExit: morphing ? 'morph' : 'dismiss' })
      mirrorWindows()
    },
    setNavOverride: (on) => saveWindowsFile({ ...get().windowsFile, navOverride: on }),
    openWindowTab: (target) => {
      const cur = get().pageWindow
      if (!cur) {
        get().openWindow(target)
        return
      }
      const next = openTabIn(cur, makeTabId, target)
      if (next === cur) return
      const spawned = next.tabs.length > cur.tabs.length
      commitWindow(next, {
        windowSlide: spawned
          ? { dir: 'fwd', seq: ++windowSlideSeq }
          : stampByOrder(cur, next.activeTabId),
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
    closeWindowTab: (id, exit) => {
      const cur = get().pageWindow
      if (!cur) return
      const next = closeTabIn(cur, id)
      if (next === cur) return
      if (next === null) {
        clearWindowCache()
        set({ windowExit: exit ?? 'dismiss' })
      } else dropWindowCache(id)
      commitWindow(next)
    },
    closeWindow: (reason) => {
      clearWindowCache()
      set({ pageWindow: null, windowExit: reason ?? 'dismiss' })
      mirrorWindows()
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
    // Monotonic across closes: living outside the summon object, a re-summon inside the window's
    // exit presence (which skips the remount) still reads as a new event.
    browserSeq: 0,
    openBrowser: (url) =>
      set((s) => {
        const seq = s.browserSeq + 1
        return { browserSeq: seq, browserSummon: { url, seq } }
      }),
    closeBrowser: () => set({ browserSummon: null }),

    // A deleted page's flush would hit a dead path, which the crud guard refuses — the stale
    // body is never written anywhere.
    reconcileWindow: (index) => {
      const cur = get().pageWindow
      if (cur) {
        const deadIds: string[] = []
        const repath = new Map<string, string>()
        for (const t of cur.tabs) {
          if (t.target.kind !== 'page') continue
          const r = reconcileWith(index, t.target)
          if (r.kind === 'none') deadIds.push(t.id)
          else if (r.kind === 'page' && r.path !== t.target.path) repath.set(t.id, r.path)
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
      if (history && reconcileWith(index, { kind: 'page', ...history }).kind === 'none')
        set({ historyTarget: null })
      const file = get().windowsFile
      const dead = Object.keys(file.origins).filter(
        (id) => reconcileWith(index, { kind: 'page', id, path: '' }).kind === 'none',
      )
      if (dead.length > 0) {
        const origins = { ...file.origins }
        for (const id of dead) delete origins[id]
        saveWindowsFile({ ...file, origins })
      }
    },

    resetWindow: () => {
      set(PER_NEXUS)
      clearWindowCache()
    },
  }
}
