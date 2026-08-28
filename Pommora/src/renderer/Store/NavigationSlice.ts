import { type Creator, DEFAULT_NEW_NAME, type MutateRequest, type RenameHost } from '@shared/mutate'
import { errText, fail, type PommoraError } from '@shared/result'
import {
  type NavigationState,
  type NavRef,
  type PageDetail,
  type SelectionState,
  type SelectTarget,
  type StoredTabSet,
  type Tab,
  toNavRef,
} from '@shared/types'
import { type ReconcileIndex, reconcileSelection, reconcileWith } from '@renderer/Actions/selection'
import { navKeysOf, reconcileIndexOf } from '../treeIndex'
import {
  moveByKey,
  navKey,
  RECENTS_CAP,
  recordRecent,
  removeRecentByKey,
} from '../Navigation/navRecents'
import { dropCapturedOutside } from '../Navigation/thumbMarkers'
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
} from '../Tabs/tabsModel'
import { clearWarm, dropPageDetail, dropWarmDetail, dropWarmTab, readWarm } from './TabState'
import {
  findCollection,
  findCollectionForSet,
  findContainer,
  findSet,
  isDepth1Set,
  parentPathOf,
} from '../Interface/Scope'
import { crumbDepthFor } from '../Interface/Subfield/crumbs'
import { ensureContainerView } from '../Views/viewMint'
import type { SessionState, Slice } from './SessionState'

export type PageTarget = Extract<SelectTarget, { kind: 'page' }>

/** An open page's current state, keyed by page id — one slot per document however many tabs point
 *  at it. `body` is the live editing buffer; `detail.body` is the load snapshot autosave never updates. */
export type PageSlot =
  | { status: 'ready'; target: PageTarget; detail: PageDetail; body: string }
  | { status: 'error'; target: PageTarget; error: PommoraError }

type ReadySlot = Extract<PageSlot, { status: 'ready' }>

/** One slice because `select`, the pin gestures, and the restore each write across all of it in
 *  one act. */
export interface NavigationSlice {
  /** What the pane is showing. During a cold page open it lags the active tab's target until the
   *  fetch lands or the deadline passes — that lag is the pause-on-change. */
  selection: SelectionState
  pages: Record<string, PageSlot>
  setPageBody: (path: string, body: string) => void
  /** `{ record: false }` refreshes the shown detail without touching the tab set or recents
   *  (Back/Forward, a path refetch, a tab activation, a preview open). `{ newTab: true }` forces a new tab. */
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
  /** The deepest node visited on the active breadcrumb path — what the footer dims its tail down to.
   *  Held while walking up the same spine, reset on a branch (→ [[SubfieldPM]]). */
  crumbDepth: SelectTarget | null
  /** Navigate a breadcrumb segment — a normal move (switches to a tab already showing the target, or
   *  replaces the current tab when it's open nowhere), but the dimmed tail survives the hop because
   *  `crumbDepth` is held across it. `dir` sets the slide (up the path is 'back', re-descending 'forward'). */
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
  /** The pinned refs hydrated against the live tree — stored, so hot readers never rebuild the index. */
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
  reorderRecent: (activeKey: string, overKey: string) => void
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

/** Which pages are loaded, as a primitive. A subscriber that only asks THAT must never hold
 *  `pages` itself: a slot re-identifies at every keystroke, and the record with it. */
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
// Clearing this must target exactly the stamp the superseded fetch was carrying (never a newer one) —
// otherwise a later stampless selection change replays the abandoned slide.
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
    // A tab-focus change (activate, new tab, a close refocusing) is not navigation — the breadcrumb
    // tail belongs to the tab you were walking, so it resets rather than leaking onto the new one.
    // In-tab moves and the breadcrumb-click dedup switch load detail through `select` directly, never
    // here, so their held depth is untouched.
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
    void window.nexus.tabs.save({ tabs, activeTabId: s.activeTabId }).catch(() => undefined)
  }

  // The slot deleters route here. Silent when nothing goes: a fresh record for an unchanged set
  // would re-identify every page surface's host.
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

  /** The active pointer's one keeper: whenever the live tab set may have shrunk (a tree push
   *  dropping a pinned entity, a synced-in unpin), re-point a dangling active at MRU-top — and
   *  when NOTHING is live, seed a fresh NavView tab rather than strand the app at zero tabs. */
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

  // A failed persist is a fact the console must hold — the envelope never rejects, so a
  // silently-dropped ack would be the only witness.
  const writeNav = (patch: Partial<NavigationState>): void => {
    void window.nexus.nav.write(patch).then((ack) => {
      if (!ack.ok) console.error('navigation write failed:', ack.error.message)
    })
  }

  // pinnedTabs' one writer. Identity-preserving, like stabilize(): an echo keeps the same array,
  // so memos hold.
  const setPinned = (pinned: NavRef[], index: ReconcileIndex | null): void => {
    const next = derivePinnedTabs(pinned, index)
    set((s) => ({ pinned, pinnedTabs: sameTabs(s.pinnedTabs, next) ? s.pinnedTabs : next }))
  }

  const commitPinned = (pinned: NavRef[]): void => {
    const tree = get().tree
    setPinned(pinned, tree ? reconcileIndexOf(tree) : null)
    writeNav({ pinned })
  }

  // In-memory recents lead disk everywhere; the persist rides along so the two can't part.
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
    for (const t of covered) dropWarmTab(t.id)
    if (activeCovered && activeCovered.target.kind !== 'newtab') {
      const pinId = pinTabId(activeCovered.target)
      set((st) => ({ activeTabId: pinId, tabMru: pushMru(st.tabMru, pinId) }))
    }
    persistTabs()
  }

  // Move the active tab's history pointer to an absolute stack index, showing what sits there without
  // re-recording — the one mover behind Back/Forward and breadcrumb re-navigation alike.
  const jumpActiveHistory = (i: number): void => {
    const s = get()
    const active = activeUnpinnedTab(s.tabs, s.activeTabId)
    if (!active || active.target.kind === 'newtab') return
    if (i < 0 || i >= active.navStack.length || i === active.navIndex) return
    const resolved = s.tree ? reconcileSelection(s.tree, active.navStack[i]) : active.navStack[i]
    if (resolved.kind === 'none') return
    // target must move in lockstep with navIndex — openTab's dedup keys off target, so a stale
    // one would mis-dedup the very next click on the shown entity, destroying the Forward stack.
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
    crumbDepth: null,
    navSlide: null,
    thumbVersions: {},
    goBack: () => stepActiveHistory(-1),
    goForward: () => stepActiveHistory(1),
    navigateCrumb: (target, dir) => {
      // A normal navigation: openTab switches to a tab already showing the target, or replaces the
      // current one. crumbDepth (kept current inside select) holds the deeper path across the move.
      void get().select(target)
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
      dropWarmTab(id)
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
      dropWarmTab(pinId)
      persistTabs()
    },

    pinTarget: (target) => {
      // A pin must resolve for as long as it is stored: agenda kinds resolve against nothing,
      // and an adopted id is re-minted on the next walk.
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
    // The push carries the FILE's keys (an external edit): pinned, favorites, banner. Recents
    // aren't in the file — the in-memory stream always leads.
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
      // recents/pins backstop the tree's fs walk, which can read a subtree as empty on a
      // transient error — this keeps a just-visited entity from a false-empty eviction.
      const live = [...navKeysOf(tree), ...get().recents.map(navKey), ...get().pinned.map(navKey)]
      dropCapturedOutside(new Set(live))
      void window.nexus.capture.evict(live)
    },
    addFavorite: (target) => {
      // Favorites are tree kinds only — an agenda favorite resolves to null, which renders as an
      // invisible row the user then has no way to remove.
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
    reorderRecent: (activeKey, overKey) => {
      const next = moveByKey(get().recents, navKey, activeKey, overKey)
      if (next) commitRecents(next)
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
      pageFetchSeq++
      // The breadcrumb's deepest node follows every navigation — held while walking up its spine, so
      // the tail stays dimmed; reset on a branch. Runs for record:false too (Back/Forward, breadcrumb).
      {
        const depth = crumbDepthFor(get().tree, get().crumbDepth, target)
        if (depth !== get().crumbDepth) set({ crumbDepth: depth })
      }
      if (get().navSlide?.seq === coldStampSeq) set({ navSlide: null })
      if (opts?.record !== false) {
        const s = get()
        const pinned = s.pinnedTabs
        const res = openTabModel(
          s.tabs,
          s.activeTabId,
          pinned,
          target,
          { newTab: opts?.newTab },
          makeTabId(),
        )
        const opened = res.tabs !== s.tabs
        set({
          tabs: res.tabs,
          activeTabId: res.activeTabId,
          tabMru: pushMru(s.tabMru, res.activeTabId),
          ...(sameShownTarget(s.selection, target)
            ? {}
            : {
                navSlide: {
                  tabId: res.activeTabId,
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
          // The path equality keeps a loaded or warm page honest across renames — a stale-path
          // detail would route saves at the old file.
          const loaded = get().pages[target.id]
          if (loaded?.status === 'ready' && loaded.detail.path === target.path) {
            set({ selection: pageSel })
            break
          }
          const cached = readWarm(get().activeTabId, navKey(target))?.pageDetail
          if (cached && cached.path === target.path) {
            land(readySlot(pageSel, cached))
            break
          }
          // Pause-on-change: the outgoing view holds until the fetch lands or COLD_SWAP_DEADLINE
          // passes; the seq fence drops a stale response after a newer navigation.
          const seq = pageFetchSeq
          coldStampSeq = get().navSlide?.seq ?? -1
          const fallback = setTimeout(() => {
            if (seq === pageFetchSeq) set({ selection: pageSel })
          }, COLD_SWAP_DEADLINE)
          let res: Awaited<ReturnType<typeof window.nexus.openPage>>
          try {
            res = await window.nexus.openPage(target.path)
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
      const res = await window.nexus.openPage(shown.target.path).catch(() => null)
      if (!res?.ok) return
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
        get().select({ kind: 'page', id: created.id, path: created.path }),
      )
    },

    createFromMenu: async (items, host) => {
      const req = await window.nexus.popCreateMenu(items)
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
      // The shown slot is spared: its re-select above lands a fresh one over it, and the pause
      // holds meanwhile. Every other slot whose page is gone or re-pathed refetches on return.
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
        for (const t of s.tabs) if (!rec.tabs.some((n) => n.id === t.id)) dropWarmTab(t.id)
        applyTabResult({ tabs: rec.tabs, activeTabId: rec.activeTabId, mru: rec.mru })
      }
      // reconcileTabs only re-points when an UNPINNED tab changed — a deleted pinned entity
      // with nothing else open leaves the pointer dangling, so the keeper always runs.
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
      // ONE hydration pass owns the restore: dead refs prune, paths mint, the history
      // pointer recomputes. The derived pinned set is already live by construction.
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
          // The cascade rewrites bodies NEXUS-WIDE — every warm copy is suspect, and the
          // tab-keyed editorState has no path fence (its key survives the rename): a warm
          // restore would revive the pre-cascade body and the next keystroke would write it
          // back over the heal.
          clearWarm()
          keepSlots(() => false)
          // The shown page's editor binds its document at mount, so a healed body reaches it only
          // through a remount — the cold re-select drops the slot out from under the surface.
          const shown = get().selection
          if (shown.kind === 'page') void get().select(shown, { record: false })
          break
        }
        case 'delete':
          dropPageDetail(req.path)
          keepSlots((_, slot) => slot.target.path !== req.path)
          break
        case 'setIcon':
          // The page's detail is a separate copy of the same fact — patch the open one and drop
          // any warm one, or the header re-reads the pre-write value until the page refetches.
          if (req.kind === 'page') {
            dropWarmDetail(req.path)
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
          if (req.kind === 'page') dropWarmDetail(req.path)
          break
      }
    },

    // Clearing activeTabId marks the tab set never-seeded, so load() re-reads the new nexus's sidecars.
    resetNavigation: () => {
      pageFetchSeq++
      set(PER_NEXUS)
      clearWarm()
    },
  }
}
