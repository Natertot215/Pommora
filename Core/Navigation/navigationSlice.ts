import {
  type Creator,
  DEFAULT_NEW_NAME,
  type MutateRequest,
  type RenameHost,
} from '@pommora/core/Pages/mutateRequest'
import { errText, fail, type PommoraError } from '@pommora/core/Contract/result'
import {
  type NavigationState,
  type NavRef,
  type SelectionState,
  type SelectTarget,
  type Tab,
  toNavRef,
} from '@pommora/core/Navigation/navRef'
import type { PageDetail } from '@pommora/core/Pages/pageDetail'
import type { StoredTabSet } from '@pommora/core/Interface/Windows/windowRecord'
import { type ReconcileIndex, reconcileSelection, reconcileWith } from '../Session/selection'
import { navKeysOf, reconcileIndexOf } from '../Session/treeIndex'
import { moveByKey, navKey, RECENTS_CAP, recordRecent, removeRecentByKey } from './navRecents'
import { dropCapturedOutside } from './thumbMarkers'
import {
  activeUnpinnedTab,
  closeTab as closeTabModel,
  derivePinnedTabs,
  hydrateTabs,
  insertUnpinned,
  isPinned,
  makeTabId,
  newTabTab,
  openNewTab as openNewTabModel,
  openTab as openTabModel,
  pinTabId,
  pushMru,
  reconcileTabs,
  reorderWithinZone,
  sameTabs,
  tabKey,
} from './tabsModel'
import {
  bumpBodyEpoch,
  clearCache,
  dropPageDetail,
  dropCacheDetail,
  fetchPageDetail,
} from '../Session/pageDetailCache'
import { dropCacheTab, readCache } from './warmTabs'
import {
  findCollection,
  findCollectionForSet,
  findContainer,
  findSet,
  isDepth1Set,
  parentPathOf,
} from '../Session/treeIndex'
import { cancelPageSave } from '../Session/saveScheduler'
import { crumbDepthFor } from '../Interface/Subfield/crumbs'
import { ensureContainerView } from '../Views/viewMint'
import type { SessionState, Slice } from '../Session/sessionState'
import type { Asks } from '@pommora/core/Contract/bridge'
import { host as dialer } from '../Platform/dialer'

export type PageTarget = Extract<SelectTarget, { kind: 'page' }>

/** `body` is the live editing buffer; `detail.body` is the load snapshot autosave never updates. */
export type PageSlot =
  | { status: 'ready'; target: PageTarget; detail: PageDetail; body: string }
  | { status: 'error'; target: PageTarget; error: PommoraError }

type ReadySlot = Extract<PageSlot, { status: 'ready' }>

/** One slice because `select`, the pin gestures, and the restore each write across all of it at once. */
export interface NavigationSlice {
  /** The pause-on-change: a cold open lags the active tab until the fetch lands or the deadline passes. */
  selection: SelectionState
  pages: Record<string, PageSlot>
  setPageBody: (path: string, body: string) => void
  /** A body replaced from outside the editor; false when the refetch failed and the editors still
   *  hold the old one. */
  replaceBody: (path: string) => Promise<boolean>
  /** `{ record: false }` refreshes the shown detail without touching the tab set or recents. */
  select: (target: SelectTarget, opts?: { record?: boolean; newTab?: boolean }) => Promise<void>
  reloadPage: () => Promise<void>
  newPage: () => Promise<void>
  createFromMenu: (items: Creator[], host?: RenameHost) => Promise<void>
  tabs: Tab[]
  activeTabId: string
  tabMru: string[]
  activateTab: (id: string) => void
  openNewTab: () => void
  closeTab: (id: string) => void
  reorderTabs: (activeId: string, overId: string) => void
  pinTab: (id: string) => void
  unpinTab: (pinId: string) => void
  goBack: () => void
  goForward: () => void
  /** The deepest node visited on the active spine — what the footer dims its tail to. */
  crumbDepth: SelectTarget | null
  /** The dimmed tail survives a segment move because `crumbDepth` holds across it. */
  navigateCrumb: (target: SelectTarget, dir: 'back' | 'forward') => void
  navSlide: {
    tabId: string
    dir: 'back' | 'forward'
    seq: number
    source: 'history' | 'tab' | 'select'
  } | null
  recents: NavRef[]
  favorites: NavRef[]
  pinned: NavRef[]
  /** Hydrated against the live tree so hot readers never rebuild the index. */
  pinnedTabs: Tab[]
  navBanner: string | undefined
  pinTarget: (target: NavRef | SelectTarget) => void
  unpinTarget: (key: string) => void
  reorderPin: (activeKey: string, overKey: string) => void
  applyNavChanged: (nav: Omit<NavigationState, 'recents'>) => void
  thumbVersions: Record<string, number>
  bumpThumb: (key: string) => void
  evictThumbs: () => void
  addFavorite: (target: NavRef | SelectTarget) => void
  removeFavorite: (key: string) => void
  removeRecent: (key: string) => void
  setRecentsOrder: (keys: string[]) => void
  reconcileNavigation: (index: ReconcileIndex) => void
  /** The first load's restore from the nexus's sidecars — the one hydration pass. */
  restoreNavigation: (nav: NavigationState | null, stored: StoredTabSet | null) => void
  /** What a confirmed write means for the open pages — the tree's own patch is the nexus's business. */
  patchPagesFor: (req: MutateRequest) => void
  /** Everything a nexus owns here, forgotten; any fetch still in flight for it can no longer land. */
  resetNavigation: () => void
}

function sameShownTarget(sel: SelectionState, t: SelectTarget): boolean {
  if (sel.kind !== t.kind) return false
  if (sel.kind === 'homepage') return true
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

/** A subscriber asking only WHICH pages are loaded must never hold `pages`: a slot re-identifies
 *  at every keystroke, and the record with it. */
export const readyPageIds = (s: SessionState): string =>
  Object.entries(s.pages)
    .filter(([, slot]) => slot.status === 'ready')
    .map(([id]) => id)
    .join(',')

const activeTabOf = (s: SessionState): Tab | undefined =>
  s.tabs.find((t) => t.id === s.activeTabId) ?? s.pinnedTabs.find((t) => t.id === s.activeTabId)

/** The pause-on-change: the active tab has moved on to a target the pane is not yet showing. */
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
  favorites: [],
  recents: [],
  navBanner: undefined,
} satisfies Partial<NavigationSlice>

export const createNavigationSlice: Slice<NavigationSlice> = (set, get) => {
  const syncActiveDetail = (): void => {
    // The breadcrumb tail belongs to the tab you were walking; a focus change isn't navigation.
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
    // Identity only at rest — paths are minted back at restore, so nothing stored can go stale.
    const tabs = s.tabs.map((t) => ({
      id: t.id,
      target: t.target.kind === 'newtab' ? t.target : toNavRef(t.target),
      navStack: t.navStack.map(toNavRef),
      navIndex: t.navIndex,
    }))
    void dialer().ask('tabs:save', { tabs, activeTabId: s.activeTabId })
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
  }

  // Both live-slot writers find their page by PATH — a body save and an icon write route by file.
  const patchReadyAt = (path: string, patch: (slot: ReadySlot) => ReadySlot): void =>
    set((s) => {
      for (const [id, slot] of Object.entries(s.pages))
        if (slot.status === 'ready' && slot.detail.path === path)
          return { pages: { ...s.pages, [id]: patch(slot) } }
      return {}
    })

  const applyTabResult = (r: { tabs: Tab[]; activeTabId: string; mru: string[] }): void => {
    const activeChanged = r.activeTabId !== get().activeTabId
    set({ tabs: r.tabs, activeTabId: r.activeTabId, tabMru: r.mru })
    if (activeChanged) syncActiveDetail()
    pruneSlots()
    persistTabs()
  }

  /** Re-points a dangling active tab (after a tree push drops it) at MRU-top, or seeds a fresh
   *  NavView tab when nothing is live rather than stranding the app at zero tabs. */
  const ensureLiveActive = (): void => {
    const s = get()
    // '' is the never-seeded sentinel — load()'s restore owns seeding, so the keeper stands down.
    if (s.activeTabId === '') return
    const live = new Set([...s.pinnedTabs.map((t) => t.id), ...s.tabs.map((t) => t.id)])
    if (live.has(s.activeTabId)) return
    const focus = s.tabMru.find((id) => live.has(id)) ?? s.tabs[0]?.id ?? s.pinnedTabs[0]?.id
    if (focus !== undefined) {
      set({
        activeTabId: focus,
        tabMru: pushMru(
          s.tabMru.filter((id) => live.has(id)),
          focus,
        ),
      })
    } else {
      const seeded = newTabTab(makeTabId())
      set({ tabs: [seeded], activeTabId: seeded.id, tabMru: [seeded.id] })
    }
    syncActiveDetail()
  }

  // The envelope never rejects, so a silently-dropped ack would be the only failure witness.
  const writeNav = (patch: Partial<NavigationState>): void => {
    void dialer()
      .ask('nav:write', patch)
      .then((ack) => {
        if (!ack.ok) console.error('navigation write failed:', ack.error.message)
      })
  }

  // Identity-preserving, like stabilize(): an echo keeps the same array, so memos hold.
  const setPinned = (pinned: NavRef[], index: ReconcileIndex | null): void => {
    const next = derivePinnedTabs(pinned, index)
    set((s) => ({ pinned, pinnedTabs: sameTabs(s.pinnedTabs, next) ? s.pinnedTabs : next }))
  }

  const commitPinned = (pinned: NavRef[]): void => {
    const tree = get().tree
    setPinned(pinned, tree ? reconcileIndexOf(tree) : null)
    writeNav({ pinned })
  }

  // In-memory recents lead disk everywhere; the persist rides along.
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
    for (const t of covered) dropCacheTab(t.id)
    if (activeCovered && activeCovered.target.kind !== 'newtab') {
      const pinId = pinTabId(activeCovered.target)
      set((st) => ({ activeTabId: pinId, tabMru: pushMru(st.tabMru, pinId) }))
    }
    persistTabs()
  }

  // The one mover behind Back/Forward and breadcrumb re-navigation alike.
  const jumpActiveHistory = (i: number): void => {
    const s = get()
    const active = activeUnpinnedTab(s.tabs, s.activeTabId)
    if (!active || active.target.kind === 'newtab') return
    if (i < 0 || i >= active.navStack.length || i === active.navIndex) return
    const resolved = s.tree ? reconcileSelection(s.tree, active.navStack[i]) : active.navStack[i]
    if (resolved.kind === 'none') return
    // target moves in lockstep with navIndex: openTab dedups on target, and a stale one would
    // mis-dedup the very next click and destroy the Forward stack.
    set({
      tabs: get().tabs.map((t) =>
        t.id === active.id ? { ...t, navIndex: i, target: resolved } : t,
      ),
      navSlide: {
        tabId: active.id,
        dir: i < active.navIndex ? 'back' : 'forward',
        seq: (s.navSlide?.seq ?? 0) + 1,
        source: 'history',
      },
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
    setPageBody: (path, body) => patchReadyAt(path, (slot) => ({ ...slot, body })),
    replaceBody: async (path) => {
      cancelPageSave(path)
      dropCacheDetail(path)
      const detail = await fetchPageDetail(path)
      if (!detail) return false
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
      // crumbDepth (kept current inside select) holds the deeper path across the move.
      void get().select(target, { newTab: false })
      // select always slides 'forward'; a move up the path reads as 'back'.
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
        navSlide: { tabId: id, dir, seq: (st.navSlide?.seq ?? 0) + 1, source: 'tab' },
      }))
      syncActiveDetail()
      persistTabs()
    },
    openNewTab: () => {
      const s = get()
      const res = openNewTabModel(s.tabs, makeTabId())
      if (res.tabs !== s.tabs && s.personalization.tabTakeFocus === false) {
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
              navSlide: {
                tabId: res.activeTabId,
                dir: 'forward' as const,
                seq: (s.navSlide?.seq ?? 0) + 1,
                source: 'tab' as const,
              },
            }
          : {}),
      })
      syncActiveDetail()
      persistTabs()
    },
    closeTab: (id) => {
      const s = get()
      const pinnedIds = s.pinnedTabs.map((t) => t.id)
      const res = closeTabModel(s.tabs, s.activeTabId, s.tabMru, pinnedIds, id, makeTabId())
      dropCacheTab(id)
      applyTabResult(res)
    },
    reorderTabs: (activeId, overId) => {
      const s = get()
      const to = s.tabs.findIndex((t) => t.id === overId)
      if (to === -1) return
      const next = reorderWithinZone(s.tabs, activeId, to)
      if (next === s.tabs) return
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
      get().unpinTarget(navKey(target))
      const existing = get().tabs.find(
        (t) => t.target.kind !== 'newtab' && navKey(t.target) === navKey(target),
      )
      const tab: Tab = existing ?? { id: makeTabId(), target, navStack: [target], navIndex: 0 }
      if (!existing) set((s) => ({ tabs: insertUnpinned(s.tabs, s.activeTabId, tab) }))
      if (get().activeTabId === pinId)
        set((s) => ({
          activeTabId: tab.id,
          tabMru: pushMru(
            s.tabMru.filter((m) => m !== pinId),
            tab.id,
          ),
        }))
      dropCacheTab(pinId)
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
    },
    reorderPin: (activeKey, overKey) => {
      const pinned = moveByKey(get().pinned, navKey, activeKey, overKey)
      if (pinned) commitPinned(pinned)
    },
    // The push carries the file's keys: pinned, favorites, banner. Recents aren't in the file —
    // the in-memory stream always leads.
    applyNavChanged: (nav) => {
      const tree = get().tree
      setPinned(nav.pinned ?? [], tree ? reconcileIndexOf(tree) : null)
      set({ favorites: nav.favorites ?? [], navBanner: nav.banner })
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
      // Recents and pins backstop a walk that read a subtree as empty on a transient error.
      const live = [...navKeysOf(tree), ...get().recents.map(navKey), ...get().pinned.map(navKey)]
      dropCapturedOutside(new Set(live))
      void dialer().ask('nav:evictThumbs', live)
    },
    addFavorite: (target) => {
      // An agenda favorite resolves to null — an invisible row with no way to remove it.
      if (target.kind === 'task' || target.kind === 'event') return
      const ref = toNavRef(target)
      const key = navKey(ref)
      if (get().favorites.some((f) => navKey(f) === key)) return
      const favorites = [...get().favorites, ref]
      set({ favorites })
      writeNav({ favorites })
    },
    removeFavorite: (key) => {
      const favorites = get().favorites.filter((f) => navKey(f) !== key)
      set({ favorites })
      writeNav({ favorites })
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
      const next = [...s.recents.filter((r) => !pos.has(navKey(r))), ...listed]
      if (next.every((r, i) => r === s.recents[i])) return
      commitRecents(next)
    },

    select: async (target, opts) => {
      const record = opts?.record !== false
      let pending: ReturnType<typeof openTabModel> | null = null
      if (record) {
        const s = get()
        const newTab = opts?.newTab ?? s.personalization.tabOpenBehavior === 'newtab'
        pending = openTabModel(s.tabs, s.activeTabId, s.pinnedTabs, target, { newTab }, makeTabId())
        if (
          newTab &&
          pending.tabs.length > s.tabs.length &&
          s.personalization.tabTakeFocus === false
        ) {
          set({ tabs: pending.tabs })
          commitRecents(recordRecent(s.recents, target, RECENTS_CAP))
          persistTabs()
          return
        }
      }
      pageFetchSeq++
      // Held while walking up the breadcrumb spine so the tail stays dimmed; reset on a branch.
      {
        const depth = crumbDepthFor(get().tree, get().crumbDepth, target)
        if (depth !== get().crumbDepth) set({ crumbDepth: depth })
      }
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
                navSlide: {
                  tabId: pending.activeTabId,
                  dir: 'forward' as const,
                  seq: (s.navSlide?.seq ?? 0) + 1,
                  source: 'select' as const,
                },
              }),
        })
        if (opened) commitRecents(recordRecent(s.recents, target, RECENTS_CAP))
        persistTabs()
      }
      switch (target.kind) {
        case 'homepage':
          set({ selection: { kind: 'homepage' } })
          break
        case 'context':
        case 'space':
          set({ selection: { kind: target.kind, id: target.id } })
          break
        case 'collection': {
          set({ selection: { kind: 'collection', id: target.id } })
          const col = findCollection(get().tree, target.id)
          if (col) ensureContainerView(col, col.properties ?? [])
          break
        }
        case 'set': {
          set({ selection: { kind: 'set', id: target.id, path: target.path } })
          const setNode = findSet(get().tree, target.id)
          if (setNode && isDepth1Set(get().tree, target.id))
            ensureContainerView(
              setNode,
              findCollectionForSet(get().tree, target.id)?.properties ?? [],
            )
          break
        }
        case 'page': {
          const pageSel: PageTarget = { kind: 'page', id: target.id, path: target.path }
          const land = (slot: PageSlot): void =>
            set((s) => ({ selection: pageSel, pages: { ...s.pages, [target.id]: slot } }))
          // Path equality keeps a loaded or warm page honest across renames.
          const loaded = get().pages[target.id]
          if (loaded?.status === 'ready' && loaded.detail.path === target.path) {
            set({ selection: pageSel })
            break
          }
          const cached = readCache(get().activeTabId, navKey(target))?.pageDetail
          if (cached && cached.path === target.path) {
            land(readySlot(pageSel, cached))
            break
          }
          // Pause-on-change; the seq fence drops a stale response.
          const seq = pageFetchSeq
          coldStampSeq = get().navSlide?.seq ?? -1
          const fallback = setTimeout(() => {
            if (seq === pageFetchSeq) set({ selection: pageSel })
          }, COLD_SWAP_DEADLINE)
          let res: Asks['page:open']['reply']
          try {
            res = await dialer().ask('page:open', target.path)
          } catch (e) {
            res = fail('operation-failed', errText(e))
          }
          clearTimeout(fallback)
          if (seq !== pageFetchSeq) return
          land(
            res.ok
              ? readySlot(pageSel, res.value)
              : { status: 'error', target: pageSel, error: res.error },
          )
          break
        }
      }
      pruneSlots()
    },

    reloadPage: async () => {
      const shown = shownPage(get())
      if (!shown) return
      const res = await dialer().ask('page:open', shown.target.path)
      if (!res.ok) return
      const body = shown.status === 'ready' ? shown.body : res.value.body
      set((s) => ({
        pages: { ...s.pages, [shown.target.id]: { ...readySlot(shown.target, res.value), body } },
      }))
    },

    newPage: async () => {
      const { tree, selection } = get()
      if (!tree) return
      let parentPath: string | null = null
      if (selection.kind === 'collection' || selection.kind === 'set')
        parentPath = findContainer(tree, (n) => n.id === selection.id)?.path ?? null
      else if (selection.kind === 'page') parentPath = parentPathOf(selection.path)
      if (parentPath === null) {
        parentPath = (tree.collections ?? [])[0]?.path ?? null
      }
      if (parentPath === null) return
      // main disambiguates the name on collision.
      await get().mutate({ op: 'createPage', parentPath, name: DEFAULT_NEW_NAME }, (created) =>
        get().select({ kind: 'page', id: created.id, path: created.path }, { newTab: false }),
      )
    },

    createFromMenu: async (items, host) => {
      const req = await dialer().ask('create-menu', items)
      if (req) await get().mutate(req, (created) => get().beginRename(created.path, true, host))
    },

    reconcileNavigation: (index) => {
      // A tree push re-hydrates the pins: renames re-title, moves re-path, deletes drop.
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
      const rec = reconcileTabs(
        s.tabs,
        s.activeTabId,
        s.tabMru,
        s.pinnedTabs.map((t) => t.id),
        (t) => {
          const r = reconcileWith(index, t)
          return r.kind === 'none' ? null : r
        },
        makeTabId(),
      )
      if (rec.changed) {
        for (const t of s.tabs) if (!rec.tabs.some((n) => n.id === t.id)) dropCacheTab(t.id)
        applyTabResult({ tabs: rec.tabs, activeTabId: rec.activeTabId, mru: rec.mru })
      }
      // reconcileTabs only re-points when an unpinned tab changed, so the keeper always runs.
      ensureLiveActive()
    },

    restoreNavigation: (nav, stored) => {
      const pinned = nav?.pinned ?? []
      const tree = get().tree
      const index = tree ? reconcileIndexOf(tree) : null
      setPinned(pinned, index)
      set({ favorites: nav?.favorites ?? [], recents: nav?.recents ?? [], navBanner: nav?.banner })
      get().evictThumbs()
      const seen = new Set<string>()
      const storedTabs = (stored?.tabs ?? []).filter((t) => {
        if (t.target.kind !== 'newtab' && isPinned(t.target, pinned)) return false
        const k = tabKey(t.target)
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
      // One hydration pass owns the restore: dead refs prune, paths mint, the pointer recomputes.
      const tabs = hydrateTabs(storedTabs, index)
      const livePinnedTabs = get().pinnedTabs
      const storedActive = stored?.activeTabId ?? ''
      const liveIds = new Set([...livePinnedTabs, ...tabs].map((t) => t.id))
      const active = liveIds.has(storedActive)
        ? storedActive
        : (tabs[0]?.id ?? livePinnedTabs[0]?.id ?? '')
      if (active === '') {
        const seeded = newTabTab(makeTabId())
        set({ tabs: [seeded], activeTabId: seeded.id, tabMru: [seeded.id] })
      } else {
        set({ tabs, activeTabId: active, tabMru: [active] })
      }
      syncActiveDetail()
    },

    patchPagesFor: (req) => {
      switch (req.op) {
        case 'rename': {
          // The cascade rewrites bodies nexus-wide and editorState's key survives the rename, so a
          // warm restore would revive the pre-cascade body.
          clearCache()
          keepSlots(() => false)
          // A remount is the only way a healed body reaches the shown page's editor.
          const shown = get().selection
          if (shown.kind === 'page') void get().select(shown, { record: false })
          break
        }
        case 'delete':
          dropPageDetail(req.path)
          keepSlots((_, slot) => slot.target.path !== req.path)
          break
        case 'setIcon':
          // Patch the open detail and drop any warm one, or the header re-reads the stale value.
          if (req.kind === 'page') {
            dropCacheDetail(req.path)
            patchReadyAt(req.path, (slot) => {
              const frontmatter = { ...slot.detail.frontmatter }
              if (req.icon === null) delete frontmatter.icon
              else frontmatter.icon = req.icon
              return { ...slot, detail: { ...slot.detail, frontmatter } }
            })
          }
          break
        case 'setBanner':
          // The open page reloads itself post-write; the warm copies of `cover` don't.
          if (req.kind === 'page') dropCacheDetail(req.path)
          break
      }
    },

    // Clearing activeTabId marks the tab set never-seeded, so load() re-reads the new nexus's sidecars.
    resetNavigation: () => {
      pageFetchSeq++
      set(PER_NEXUS)
      clearCache()
    },
  }
}
