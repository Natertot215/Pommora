import { persist } from '@pommora/core/Interface/Notifications/notifications'
import type { MutateRequest } from '@pommora/core/Nexus/mutateRequest'
import type { PommoraError } from '@pommora/core/Contract/result'
import {
  type NavigationState,
  type NavRef,
  isSingleton,
  navKey,
  type PageTarget,
  type SelectionState,
  type SelectTarget,
  type StoredTabSet,
  type Tab,
  toNavRef,
} from '@pommora/core/Navigation/navRef'
import type { PageDetail } from '@pommora/core/Pages/pageDetail'
import { settingOf } from '@pommora/core/Settings/personalization'
import {
  type ReconcileIndex,
  reconcileHeld,
  reconcileSelection,
  reconcileWith,
} from './reconcileSelection'
import { navKeysOf, reconcileIndexOf } from '../Nexus/treeIndex'
import { RECENTS_CAP, recordRecent, removeRecentByKey } from '../Navigation/navRecents'
import { moveBefore } from '@pommora/uix/Utilities/moveItem'
import { dropCapturedOutside } from '../Navigation/thumbMarkers'
import {
  activeUnpinnedTab,
  closeTab as closeTabModel,
  derivePinnedTabs,
  hydrateTabs,
  insertUnpinned,
  isPinned,
  makeTabId,
  openNewTab as openNewTabModel,
  openTab as openTabModel,
  openTabAt as openTabAtModel,
  pinTabId,
  pushMru,
  reconcileTab,
  sameTabs,
  settleFocus,
  type TabFocus,
  tabKey,
} from '../Navigation/tabsModel'
import {
  bumpBodyEpoch,
  clearCache,
  dropPageDetail,
  dropCacheDetail,
  cachePageDetail,
  fetchPageDetail,
  fetchPageResult,
  setBodyBase,
} from './pageDetailCache'
import { dropWarmOwner, readWarm } from './warmCache'
import { dropAllTileDocs } from '../Tiles/tileDocStore'
import { cancelPageSave, scheduleTabsSave } from './saveScheduler'
import { crumbDepthFor } from '../Interface/Subfield/crumbs'
import type { SessionState, Slice } from './sessionState'
import { dialer } from '../Platform/dialer'

export type PageSlot =
  | { status: 'ready'; target: PageTarget; detail: PageDetail; body: string }
  | { status: 'error'; target: PageTarget; error: PommoraError }

type ReadySlot = Extract<PageSlot, { status: 'ready' }>

export interface NavigationSlice {
  selection: SelectionState
  pages: Record<string, PageSlot>
  setPageBody: (path: string, body: string) => void
  replaceBody: (path: string) => Promise<boolean>
  select: (
    target: SelectTarget,
    opts?: { record?: boolean; newTab?: boolean; heading?: string },
  ) => Promise<void>
  reloadPage: () => Promise<void>
  tabs: Tab[]
  activeTabId: string
  tabMru: string[]
  activateTab: (id: string) => void
  openNewTab: (take?: boolean) => void
  openTabAt: (target: SelectTarget, index: number) => void
  closeTab: (id: string) => void
  reorderTabs: (id: string, beforeId: string | null) => void
  pinTab: (id: string) => void
  unpinTab: (pinId: string) => void
  goBack: () => void
  goForward: () => void
  crumbDepth: SelectTarget | null
  navigateCrumb: (target: SelectTarget, dir: 'back' | 'forward') => void
  navSlide: NavSlide | null
  recents: NavRef[]
  pinned: NavRef[]
  pinnedTabs: Tab[]
  navBanner: string | undefined
  pinTarget: (target: NavRef | SelectTarget) => void
  unpinTarget: (key: string) => void
  reorderPin: (key: string, beforeKey: string | null) => void
  applyNavChanged: (nav: Omit<NavigationState, 'recents'>) => void
  thumbVersions: Record<string, number>
  bumpThumb: (key: string) => void
  evictThumbs: () => void
  removeRecent: (key: string) => void
  setRecentsOrder: (keys: string[]) => void
  reconcileNavigation: (index: ReconcileIndex) => void
  restoreNavigation: (nav: NavigationState | null, stored: StoredTabSet | null) => void
  patchPagesFor: (req: MutateRequest) => void
  resetNavigation: () => void
  pendingTravel: PendingTravel | null
  clearPendingTravel: () => void
}

// A tab's travel names its landing tab, so a background tab closed unvisited leaves no jump for the next surface to show its page.
type PendingTravel = { path: string; heading: string } & (
  | { route: 'tab'; tabId: string }
  | { route: 'window' }
)

interface NavSlide {
  tabId: string
  dir: 'back' | 'forward'
  seq: number
  source: 'history' | 'tab' | 'select'
}

/** Each stamp bumps the sequence: the view plays a slide once per new number, never per render. */
const slide = (
  prior: NavSlide | null,
  tabId: string,
  dir: NavSlide['dir'],
  source: NavSlide['source'],
): NavSlide => ({ tabId, dir, seq: (prior?.seq ?? 0) + 1, source })

function sameShownTarget(sel: SelectionState, t: SelectTarget): boolean {
  if (sel.kind !== t.kind) return false
  if (isSingleton(sel)) return true
  if (sel.kind === 'page') return t.kind === 'page' && sel.id === t.id && sel.path === t.path
  return 'id' in t && 'id' in sel && sel.id === t.id
}

const readySlot = (target: PageTarget, detail: PageDetail): ReadySlot => ({
  status: 'ready',
  target,
  detail,
  body: detail.body,
})

export const shownPage = (s: SessionState): PageSlot | undefined =>
  s.selection.kind === 'page' ? s.pages[s.selection.id] : undefined

export const shownDetail = (s: SessionState): PageDetail | null => {
  const slot = shownPage(s)
  return slot?.status === 'ready' ? slot.detail : null
}

export const pageBody = (slot: PageSlot | undefined): string =>
  slot?.status === 'ready' ? slot.body : ''

/** A subscriber asking only WHICH pages are loaded must never hold `pages`: a slot re-identifies at every keystroke, and the record with it. */
export const readyPageIds = (s: SessionState): string =>
  Object.entries(s.pages)
    .filter(([, slot]) => slot.status === 'ready')
    .map(([id]) => id)
    .join(',')

export const tabOf = (s: SessionState, id: string): Tab | undefined =>
  s.tabs.find((t) => t.id === id) ?? s.pinnedTabs.find((t) => t.id === id)

const activeTabOf = (s: SessionState): Tab | undefined => tabOf(s, s.activeTabId)

export const frozenOf = (s: SessionState): boolean => {
  const target = activeTabOf(s)?.target
  return target !== undefined && target.kind !== 'newtab' && !sameShownTarget(s.selection, target)
}

let pageFetchSeq = 0
const COLD_SWAP_DEADLINE = 200
// Cleared against the exact stamp the superseded fetch carried; a newer one replays the abandoned slide.
let coldStampSeq = -1

const PER_NEXUS = {
  selection: { kind: 'none' },
  pages: {},
  tabs: [],
  activeTabId: '',
  tabMru: [],
  pinned: [],
  pinnedTabs: [],
  recents: [],
  navBanner: undefined,
  pendingTravel: null,
} satisfies Partial<NavigationSlice>

export const createNavigationSlice: Slice<NavigationSlice> = (set, get) => {
  const syncActiveDetail = (): void => {
    set({ crumbDepth: null })
    const active = activeTabOf(get())
    if (!active || active.target.kind === 'newtab') {
      pageFetchSeq++
      set({ selection: { kind: 'none' } })
      return
    }
    const tree = get().tree
    const reconciled = tree ? reconcileSelection(tree, active.target) : active.target
    void get().select(reconciled.kind === 'none' ? active.target : reconciled, { record: false })
  }

  const persistTabs = (): void => {
    const s = get()
    const tabs = s.tabs.map((t) => ({
      id: t.id,
      target: t.target.kind === 'newtab' ? t.target : toNavRef(t.target),
      navStack: t.navStack.map(toNavRef),
      navIndex: t.navIndex,
    }))
    scheduleTabsSave({ tabs, activeTabId: s.activeTabId })
  }

  // Silent when nothing goes: a fresh record would re-identify every page surface's host.
  const keepSlots = (keep: (id: string, slot: PageSlot) => boolean): void => {
    const pages = get().pages
    const kept = Object.entries(pages).filter(([id, slot]) => keep(id, slot))
    if (kept.length !== Object.keys(pages).length) set({ pages: Object.fromEntries(kept) })
  }

  const pruneSlots = (): void => {
    const s = get()
    const live = new Set<string>()
    if (s.selection.kind === 'page') live.add(s.selection.id)
    for (const t of [...s.tabs, ...s.pinnedTabs])
      if (t.target.kind === 'page') live.add(t.target.id)
    keepSlots((id) => live.has(id))
    s.pruneViewSearch()
  }

  const retagTab = (oldId: string, newId: string): void => {
    get().retagTabPins(oldId, newId)
    get().retagTabSearch(oldId, newId)
  }

  const applyTabResult = (r: TabFocus): void => {
    const s = get()
    const next = settleFocus(
      r,
      s.pinnedTabs.map((t) => t.id),
      makeTabId(),
    )
    const activeChanged = next.activeTabId !== s.activeTabId
    set({ tabs: next.tabs, activeTabId: next.activeTabId, tabMru: next.mru })
    if (activeChanged) syncActiveDetail()
    pruneSlots()
    persistTabs()
  }

  const ensureLiveActive = (): void => {
    const s = get()
    // '' is the never-seeded sentinel — load()'s restore owns seeding, so the keeper stands down.
    if (s.activeTabId === '') return
    if (tabOf(s, s.activeTabId)) return
    applyTabResult({ tabs: s.tabs, activeTabId: s.activeTabId, mru: s.tabMru })
  }

  const writeNav = (patch: Partial<NavigationState>): void =>
    void persist('navigation', dialer().ask('nav:write', patch), true)

  const setPinned = (pinned: NavRef[], index: ReconcileIndex | null): void => {
    const next = derivePinnedTabs(pinned, index)
    // A pinned tab whose id vanishes here is a tab close for the glance pins and the search tagged to it (unpin, or its target deleted) — scrub them, the pinned-tab analog of closeTab. unpinTab retags before it reaches here, so its migration is already off the vanishing id.
    for (const t of get().pinnedTabs) {
      if (next.some((n) => n.id === t.id)) continue
      get().scrubTabPins(t.id)
      get().scrubTabSearch(t.id)
    }
    set((s) => ({ pinned, pinnedTabs: sameTabs(s.pinnedTabs, next) ? s.pinnedTabs : next }))
  }

  const commitPinned = (pinned: NavRef[]): void => {
    const tree = get().tree
    setPinned(pinned, tree ? reconcileIndexOf(tree) : null)
    writeNav({ pinned })
  }

  const commitRecents = (recents: NavRef[]): void => {
    set({ recents })
    writeNav({ recents })
  }

  const graduatePinCovered = (): void => {
    const s = get()
    const covered = s.tabs.filter((t) => t.target.kind !== 'newtab' && isPinned(t.target, s.pinned))
    if (covered.length === 0) return
    const activeCovered = covered.find((t) => t.id === s.activeTabId)
    set({
      tabs: s.tabs.filter((t) => !covered.includes(t)),
      tabMru: s.tabMru.filter((m) => !covered.some((c) => c.id === m)),
    })
    for (const t of covered) {
      dropWarmOwner(t.id)
      // Pins survive the re-key (unlike the warm cache, which is dropped): a graduated tab keeps its pins and search under the pinned id.
      if (t.target.kind !== 'newtab') retagTab(t.id, pinTabId(t.target))
    }
    if (activeCovered && activeCovered.target.kind !== 'newtab') {
      const pinId = pinTabId(activeCovered.target)
      set((st) => ({ activeTabId: pinId, tabMru: pushMru(st.tabMru, pinId) }))
    }
    persistTabs()
  }

  const landPage = async (target: PageTarget): Promise<boolean> => {
    const land = (slot: PageSlot): void =>
      set((s) => ({ selection: target, pages: { ...s.pages, [target.id]: slot } }))
    const loaded = get().pages[target.id]
    if (loaded?.status === 'ready' && loaded.detail.path === target.path) {
      set({ selection: target })
      return true
    }
    const cached = readWarm(get().activeTabId, navKey(target))?.pageDetail
    if (cached && cached.path === target.path) {
      cachePageDetail(cached)
      land(readySlot(target, cached))
      return true
    }
    const seq = pageFetchSeq
    coldStampSeq = get().navSlide?.seq ?? -1
    const fallback = setTimeout(() => {
      if (seq === pageFetchSeq) set({ selection: target })
    }, COLD_SWAP_DEADLINE)
    const res = await fetchPageResult(target.path)
    clearTimeout(fallback)
    if (seq !== pageFetchSeq) return false
    land(res.ok ? readySlot(target, res.value) : { status: 'error', target, error: res.error })
    return true
  }

  const jumpActiveHistory = (i: number): void => {
    const s = get()
    const active = activeUnpinnedTab(s.tabs, s.activeTabId)
    if (!active || active.target.kind === 'newtab') return
    if (i < 0 || i >= active.navStack.length || i === active.navIndex) return
    const resolved = s.tree ? reconcileSelection(s.tree, active.navStack[i]) : active.navStack[i]
    if (resolved.kind === 'none') return
    // target moves in lockstep with navIndex: openTab dedups on target, and a stale one would mis-dedup the very next click and destroy the Forward stack.
    set({
      tabs: get().tabs.map((t) =>
        t.id === active.id ? { ...t, navIndex: i, target: resolved } : t,
      ),
      navSlide: slide(s.navSlide, active.id, i < active.navIndex ? 'back' : 'forward', 'history'),
    })
    void get().select(resolved, { record: false })
    persistTabs()
  }

  const stepActiveHistory = (delta: number): void => {
    const s = get()
    const active = activeUnpinnedTab(s.tabs, s.activeTabId)
    if (!active || active.target.kind === 'newtab') return
    for (let i = active.navIndex + delta; i >= 0 && i < active.navStack.length; i += delta) {
      const resolved = s.tree ? reconcileSelection(s.tree, active.navStack[i]) : active.navStack[i]
      if (resolved.kind === 'none') continue
      jumpActiveHistory(i)
      return
    }
  }

  return {
    ...PER_NEXUS,
    setPageBody: (path, body) =>
      set((s) => {
        for (const [id, slot] of Object.entries(s.pages))
          if (slot.status === 'ready' && slot.detail.path === path)
            return { pages: { ...s.pages, [id]: { ...slot, body } } }
        return {}
      }),
    replaceBody: async (path) => {
      cancelPageSave(path)
      dropCacheDetail(path)
      const detail = await fetchPageDetail(path)
      if (!detail) return false
      setBodyBase(path, { text: detail.body, hash: detail.bodyHash })
      get().setPageBody(path, detail.body)
      bumpBodyEpoch(path)
      return true
    },
    crumbDepth: null,
    navSlide: null,
    thumbVersions: {},
    goBack: () => stepActiveHistory(-1),
    goForward: () => stepActiveHistory(1),
    navigateCrumb: (target, dir) => {
      void get().select(target, { newTab: false })
      if (dir === 'back') {
        const ns = get().navSlide
        if (ns) set({ navSlide: { ...ns, dir: 'back' } })
      }
    },
    activateTab: (id) => {
      const s = get()
      if (s.activeTabId === id) return
      const order = [...s.pinnedTabs.map((t) => t.id), ...s.tabs.map((t) => t.id)]
      const dir: 'back' | 'forward' =
        order.indexOf(id) < order.indexOf(s.activeTabId) ? 'back' : 'forward'
      set((st) => ({
        activeTabId: id,
        tabMru: pushMru(st.tabMru, id),
        navSlide: slide(st.navSlide, id, dir, 'tab'),
      }))
      syncActiveDetail()
      persistTabs()
    },
    openNewTab: (take) => {
      const s = get()
      const res = openNewTabModel(s.tabs, makeTabId())
      if (res.tabs !== s.tabs && !(take ?? settingOf(s.personalization, 'tabTakeFocus'))) {
        set({ tabs: res.tabs })
        persistTabs()
        return
      }
      const swaps = res.activeTabId !== s.activeTabId || s.selection.kind !== 'none'
      set({
        tabs: res.tabs,
        activeTabId: res.activeTabId,
        tabMru: pushMru(s.tabMru, res.activeTabId),
        ...(swaps
          ? {
              navSlide: slide(s.navSlide, res.activeTabId, 'forward', 'tab'),
            }
          : {}),
      })
      syncActiveDetail()
      persistTabs()
    },
    openTabAt: (target, index) => {
      const s = get()
      const next = openTabAtModel(s.tabs, s.pinnedTabs, target, index, makeTabId())
      if (next === s.tabs) return
      set({ tabs: next })
      persistTabs()
    },
    closeTab: (id) => {
      const s = get()
      const pinnedIds = s.pinnedTabs.map((t) => t.id)
      const res = closeTabModel(s.tabs, s.activeTabId, s.tabMru, pinnedIds, id, makeTabId())
      dropWarmOwner(id)
      get().scrubTabPins(id)
      applyTabResult(res)
    },
    reorderTabs: (id, beforeId) => {
      const next = moveBefore(get().tabs, (t) => t.id, id, beforeId)
      if (!next) return
      set({ tabs: next })
      persistTabs()
    },
    pinTab: (id) => {
      const tab = get().tabs.find((t) => t.id === id)
      if (!tab || tab.target.kind === 'newtab') return
      get().pinTarget(tab.target)
    },
    unpinTab: (pinId) => {
      const pinnedTab = get().pinnedTabs.find((t) => t.id === pinId)
      if (!pinnedTab || pinnedTab.target.kind === 'newtab') return
      const target = pinnedTab.target
      const existing = get().tabs.find(
        (t) => t.target.kind !== 'newtab' && navKey(t.target) === navKey(target),
      )
      const tab: Tab = existing ?? { id: makeTabId(), target, navStack: [target], navIndex: 0 }
      // Re-tag to the exact id this unpin mints (a fresh makeTabId would orphan the pins and search on a dead tab), and BEFORE unpinTarget — its setPinned scrub drops the vanishing pin: id's pins and search, so the migration must already have moved them off it.
      retagTab(pinId, tab.id)
      if (!existing) set((s) => ({ tabs: insertUnpinned(s.tabs, s.activeTabId, tab) }))
      if (get().activeTabId === pinId)
        set((s) => ({
          activeTabId: tab.id,
          tabMru: pushMru(
            s.tabMru.filter((m) => m !== pinId),
            tab.id,
          ),
        }))
      get().unpinTarget(navKey(target))
      dropWarmOwner(pinId)
      persistTabs()
    },

    pinTarget: (target) => {
      // A pin must resolve for as long as it is stored; agenda kinds resolve against nothing.
      if (target.kind === 'task' || target.kind === 'event') return
      if ('id' in target && target.id.startsWith('adopted-')) return
      const ref = toNavRef(target)
      const key = navKey(ref)
      if (get().pinned.some((p) => navKey(p) === key)) return
      commitPinned([...get().pinned, ref])
      graduatePinCovered()
    },
    unpinTarget: (key) => {
      if (!get().pinned.some((p) => navKey(p) === key)) return
      commitPinned(get().pinned.filter((p) => navKey(p) !== key))
      ensureLiveActive()
    },
    reorderPin: (key, beforeKey) => {
      const pinned = moveBefore(get().pinned, navKey, key, beforeKey)
      if (pinned) commitPinned(pinned)
    },
    // The push carries the file's keys: pinned and banner. Recents aren't in the file — the in-memory stream always leads.
    applyNavChanged: (nav) => {
      const tree = get().tree
      setPinned(nav.pinned ?? [], tree ? reconcileIndexOf(tree) : null)
      set({ navBanner: nav.banner })
      graduatePinCovered()
      ensureLiveActive()
    },
    bumpThumb: (key) =>
      set((s) => ({
        thumbVersions: { ...s.thumbVersions, [key]: (s.thumbVersions[key] ?? 0) + 1 },
      })),
    evictThumbs: () => {
      const tree = get().tree
      if (!tree) return
      const live = [...navKeysOf(tree), ...get().recents.map(navKey), ...get().pinned.map(navKey)]
      dropCapturedOutside(new Set(live))
      void dialer().ask('nav:evictThumbs', live)
    },
    removeRecent: (key) => {
      const next = removeRecentByKey(get().recents, key)
      if (next === get().recents) return
      commitRecents(next)
    },
    setRecentsOrder: (keys) => {
      const s = get()
      const pos = new Map(keys.map((k, i) => [k, i]))
      const listed = s.recents.filter((r) => pos.has(navKey(r)))
      listed.sort((a, b) => (pos.get(navKey(a)) ?? 0) - (pos.get(navKey(b)) ?? 0))
      let i = 0
      const next = s.recents.map((r) => (pos.has(navKey(r)) ? listed[i++] : r))
      if (next.every((r, at) => r === s.recents[at])) return
      commitRecents(next)
    },

    select: async (target, opts) => {
      const was = get()
      const newTab = opts?.newTab ?? settingOf(was.personalization, 'tabOpenBehavior') === 'newtab'
      const pending =
        opts?.record === false
          ? null
          : openTabModel(was.tabs, was.activeTabId, was.pinnedTabs, target, { newTab }, makeTabId())
      if (opts?.heading && target.kind === 'page') {
        const tabId = pending?.activeTabId ?? was.activeTabId
        set({ pendingTravel: { route: 'tab', tabId, path: target.path, heading: opts.heading } })
      }
      if (
        pending &&
        newTab &&
        pending.tabs.length > was.tabs.length &&
        !settingOf(was.personalization, 'tabTakeFocus')
      ) {
        set({ tabs: pending.tabs })
        commitRecents(recordRecent(was.recents, target, RECENTS_CAP))
        persistTabs()
        return
      }
      pageFetchSeq++
      // Held while walking up the breadcrumb spine so the tail stays dimmed; reset on a branch.
      set((s) => ({ crumbDepth: crumbDepthFor(s.tree, s.crumbDepth, target) }))
      if (get().navSlide?.seq === coldStampSeq) set({ navSlide: null })
      if (pending) {
        const s = get()
        const opened = pending.tabs !== s.tabs
        set({
          tabs: pending.tabs,
          activeTabId: pending.activeTabId,
          tabMru: pushMru(s.tabMru, pending.activeTabId),
          ...(sameShownTarget(s.selection, target)
            ? {}
            : {
                navSlide: slide(s.navSlide, pending.activeTabId, 'forward', 'select'),
              }),
        })
        if (opened) commitRecents(recordRecent(s.recents, target, RECENTS_CAP))
        persistTabs()
      }
      switch (target.kind) {
        case 'homepage':
          set({ selection: { kind: 'homepage' } })
          break
        case 'matrix':
          set({ selection: { kind: 'matrix' } })
          break
        case 'context':
        case 'space':
          set({ selection: { kind: target.kind, id: target.id } })
          break
        case 'collection':
          set({ selection: { kind: 'collection', id: target.id } })
          break
        case 'set':
          set({ selection: { kind: 'set', id: target.id, path: target.path } })
          break
        case 'page':
          if (!(await landPage({ kind: 'page', id: target.id, path: target.path }))) return
          break
      }
      pruneSlots()
    },

    reloadPage: async () => {
      const shown = shownPage(get())
      if (!shown) return
      const detail = await fetchPageDetail(shown.target.path)
      if (!detail) return
      const body = shown.status === 'ready' ? shown.body : detail.body
      set((s) => ({
        pages: { ...s.pages, [shown.target.id]: { ...readySlot(shown.target, detail), body } },
      }))
    },

    reconcileNavigation: (index) => {
      setPinned(get().pinned, index)
      const prev = get().selection
      const next = reconcileWith(index, prev)
      if (next !== prev) {
        if (next.kind === 'none') {
          pageFetchSeq++
          set({ selection: next })
        } else if (next.kind === 'page') {
          void get().select(next, { record: false })
        }
      }
      // The shown slot is spared: its re-select above lands a fresh one over it.
      const shownSlotId = prev.kind === 'page' ? prev.id : null
      keepSlots((id, slot) => {
        if (id === shownSlotId) return true
        const r = reconcileWith(index, slot.target)
        return r.kind === 'page' && r.path === slot.target.path
      })
      const s = get()
      const { next: tabs, dropped } = reconcileHeld(s.tabs, (t) =>
        reconcileTab(t, (target) => {
          const r = reconcileWith(index, target)
          return r.kind === 'none' ? null : r
        }),
      )
      for (const t of dropped) {
        dropWarmOwner(t.id)
        get().scrubTabPins(t.id)
      }
      if (tabs !== s.tabs) applyTabResult({ tabs, activeTabId: s.activeTabId, mru: s.tabMru })
      else ensureLiveActive()
    },

    restoreNavigation: (nav, stored) => {
      const pinned = nav?.pinned ?? []
      const tree = get().tree
      const index = tree ? reconcileIndexOf(tree) : null
      setPinned(pinned, index)
      set({ recents: nav?.recents ?? [], navBanner: nav?.banner })
      get().evictThumbs()
      const seen = new Set<string>()
      const storedTabs = (stored?.tabs ?? []).filter((t) => {
        if (t.target.kind !== 'newtab' && isPinned(t.target, pinned)) return false
        const k = tabKey(t.target)
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
      const tabs = hydrateTabs(storedTabs, index)
      const focus = settleFocus(
        { tabs, activeTabId: stored?.activeTabId ?? '', mru: [] },
        get().pinnedTabs.map((t) => t.id),
        makeTabId(),
      )
      set({ tabs: focus.tabs, activeTabId: focus.activeTabId, tabMru: focus.mru })
      syncActiveDetail()
    },

    patchPagesFor: (req) => {
      switch (req.op) {
        case 'delete':
          dropPageDetail(req.path)
          keepSlots((_, slot) => slot.target.path !== req.path)
          break
        case 'setBanner':
          if (req.kind === 'page') dropCacheDetail(req.path)
          break
      }
    },

    // Clearing activeTabId marks the tab set never-seeded until load() restores the new nexus's.
    resetNavigation: () => {
      pageFetchSeq++
      set(PER_NEXUS)
      clearCache()
      dropAllTileDocs()
    },
    clearPendingTravel: () => set({ pendingTravel: null }),
  }
}
