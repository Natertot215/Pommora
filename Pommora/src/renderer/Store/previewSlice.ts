import {
  EMPTY_PREVIEWS,
  type PreviewSetRecord,
  type PreviewsFile,
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
  type PreviewState,
  type PreviewTab,
  reorderTabIn,
} from '../Windows/windowTabs'
import { clearWindowCache, dropWindowCache } from '../Windows/windowCache'
import { stashWindowMorph } from '../Windows/windowMorph'
import type { SessionState, Slice } from './sessionState'

export type PreviewTarget = { id: string; path: string }

export interface PreviewSlice {
  preview: PreviewState | null
  previewsFile: PreviewsFile
  previewSlide: { dir: 'back' | 'fwd'; seq: number } | null
  previewExit: 'dismiss' | 'engulf' | 'morph'
  openPreview: (target: PreviewTarget) => void
  /** The page whose history window is open; null = closed. */
  historyTarget: PreviewTarget | null
  openHistory: (target: PreviewTarget) => void
  closeHistory: () => void
  openNavPreview: () => void
  openPreviewTab: (target: PreviewTarget) => void
  activatePreviewTab: (id: string) => void
  reorderPreviewTabs: (activeId: string, overId: string) => void
  closePreviewTab: (id: string, exit?: 'dismiss' | 'engulf') => void
  closePreview: (reason?: 'dismiss' | 'engulf') => void
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
  reconcilePreview: (index: ReconcileIndex) => void
  resetPreview: () => void
}

export const previewTargetOf = (s: SessionState): PreviewTarget | null => deriveTarget(s.preview)

const PER_NEXUS = {
  navOpen: false,
  preview: null,
  historyTarget: null,
  previewsFile: EMPTY_PREVIEWS,
  previewSlide: null,
} satisfies Partial<PreviewSlice>

export const createPreviewSlice: Slice<PreviewSlice> = (set, get) => {
  let previewSlideSeq = 0
  const stampByOrder = (
    cur: PreviewState,
    nextId: string,
  ): { dir: 'back' | 'fwd'; seq: number } => {
    const from = cur.tabs.findIndex((t) => t.id === cur.activeTabId)
    const to = cur.tabs.findIndex((t) => t.id === nextId)
    return { dir: to < from ? 'back' : 'fwd', seq: ++previewSlideSeq }
  }

  // The gallery sentinel never persists — only the page tabs write, and activeIndex counts by
  // the stored (page-only) order.
  const toPreviewRecord = (p: PreviewState): PreviewSetRecord => {
    const pages = p.tabs.filter(
      (t): t is PreviewTab & { target: SelectTarget } => t.target.kind !== 'navwindow',
    )
    return {
      tabs: pages.map((t) => ({ target: toNavRef(t.target) })),
      activeIndex: Math.max(
        0,
        pages.findIndex((t) => t.id === p.activeTabId),
      ),
    }
  }

  const savePreviewsFile = (file: PreviewsFile): void => {
    set({ previewsFile: file })
    void (window as { nexus?: typeof window.nexus }).nexus?.previews
      ?.save(file)
      .catch(() => undefined)
  }

  const mirrorPreviews = (retire?: string): void => {
    const s = get()
    const p = s.preview
    let file = s.previewsFile
    if (retire && retire !== p?.originId) {
      const { [retire]: _dropped, ...origins } = file.origins
      file = { ...file, origins }
    }
    if (p) {
      const rec = toPreviewRecord(p)
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
    savePreviewsFile(file)
  }

  const reconcileRecord = (
    rec: PreviewSetRecord | null | undefined,
  ): { tabs: PreviewTab[]; activeTab: PreviewTab | null } => {
    if (!rec) return { tabs: [], activeTab: null }
    const tree = get().tree
    const index = tree ? reconcileIndexOf(tree) : null
    const seen = new Set<string>()
    const tabs: PreviewTab[] = []
    let activeTab: PreviewTab | null = null
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

  const commitPreview = (
    next: PreviewState | null,
    extra?: { previewSlide: ReturnType<typeof stampByOrder> },
  ): void => {
    const prev = get().preview
    set({ preview: next, ...extra })
    const retire =
      prev && prev.flavor === 'page' && prev.originId !== next?.originId ? prev.originId : undefined
    mirrorPreviews(retire)
  }

  return {
    ...PER_NEXUS,
    previewExit: 'dismiss',
    openHistory: (target) => set({ historyTarget: target }),
    closeHistory: () => set({ historyTarget: null }),
    openPreview: (target) => {
      const cur = get().preview
      if (cur?.flavor === 'page' && cur.originId === target.id) return
      const { tabs: restored, activeTab } = reconcileRecord(get().previewsFile.origins[target.id])
      const tabs =
        restored.length > 0
          ? restored
          : [{ id: makeTabId(), target: { kind: 'page' as const, ...target } }]
      const preview: PreviewState = {
        flavor: 'page',
        originId: target.id,
        tabs,
        activeTabId: (activeTab ?? tabs[0]).id,
      }
      clearWindowCache()
      // previewExit re-seeds on every open — only a close that writes 'engulf' plays the FLIP.
      set({ preview, navOpen: false, previewExit: 'dismiss' })
      mirrorPreviews()
    },
    openNavPreview: () => {
      const cur = get().preview
      if (cur?.flavor === 'nav') return
      // A live page preview morphs into the NavWindow rather than dismiss + fresh open — its
      // rect is stashed for the nav's mount FLIP, and 'morph' hides the outgoing window instantly.
      const morphing = cur?.flavor === 'page'
      if (morphing) stashWindowMorph()
      const { tabs: pages } = reconcileRecord(get().previewsFile.navSet)
      const sentinel = { id: makeTabId(), target: { kind: 'navwindow' as const } }
      const preview: PreviewState = {
        flavor: 'nav',
        originId: 'navwindow',
        tabs: [sentinel, ...pages],
        activeTabId: sentinel.id,
      }
      clearWindowCache()
      set({ preview, previewExit: morphing ? 'morph' : 'dismiss' })
      mirrorPreviews()
    },
    setNavOverride: (on) => savePreviewsFile({ ...get().previewsFile, navOverride: on }),
    openPreviewTab: (target) => {
      const cur = get().preview
      if (!cur) {
        get().openPreview(target)
        return
      }
      const next = openTabIn(cur, makeTabId, target)
      if (next === cur) return
      const spawned = next.tabs.length > cur.tabs.length
      commitPreview(next, {
        previewSlide: spawned
          ? { dir: 'fwd', seq: ++previewSlideSeq }
          : stampByOrder(cur, next.activeTabId),
      })
    },
    activatePreviewTab: (id) => {
      const cur = get().preview
      if (!cur || cur.activeTabId === id || !cur.tabs.some((t) => t.id === id)) return
      const next = { ...cur, activeTabId: id }
      commitPreview(next, { previewSlide: stampByOrder(cur, id) })
    },
    reorderPreviewTabs: (activeId, overId) => {
      const cur = get().preview
      if (!cur) return
      const next = reorderTabIn(cur, activeId, overId)
      if (next === cur) return
      commitPreview(next)
    },
    closePreviewTab: (id, exit) => {
      const cur = get().preview
      if (!cur) return
      const next = closeTabIn(cur, id)
      if (next === cur) return
      if (next === null) {
        clearWindowCache()
        set({ previewExit: exit ?? 'dismiss' })
      } else dropWindowCache(id)
      commitPreview(next)
    },
    closePreview: (reason) => {
      clearWindowCache()
      set({ preview: null, previewExit: reason ?? 'dismiss' })
      mirrorPreviews()
    },

    openNav: () => {
      set({ navOpen: true })
      get().openNavPreview()
    },
    closeNav: () => {
      clearWindowCache()
      set({ navOpen: false, preview: null })
      mirrorPreviews()
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
    reconcilePreview: (index) => {
      const cur = get().preview
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
          let next: PreviewState | null = cur
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
          commitPreview(next)
        }
      }
      const history = get().historyTarget
      if (history && reconcileWith(index, { kind: 'page', ...history }).kind === 'none')
        set({ historyTarget: null })
      const file = get().previewsFile
      const dead = Object.keys(file.origins).filter(
        (id) => reconcileWith(index, { kind: 'page', id, path: '' }).kind === 'none',
      )
      if (dead.length > 0) {
        const origins = { ...file.origins }
        for (const id of dead) delete origins[id]
        savePreviewsFile({ ...file, origins })
      }
    },

    resetPreview: () => {
      set(PER_NEXUS)
      clearWindowCache()
    },
  }
}
