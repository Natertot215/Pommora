import { create } from 'zustand'
import { blockHostKey, type BlockHostRef } from '@shared/blocks'
import {
  EMPTY_PREVIEWS,
  DEFAULT_COMMANDS,
  type AgendaEntry,
  type NavigationState,
  type NavRef,
  type NavViewMode,
  type NexusTree,
  type PageDetail,
  type Personalization,
  type PreviewSetRecord,
  type PreviewsFile,
  type SelectionState,
  type SelectTarget,
  type SetNode,
  type Tab,
} from '@shared/types'
import { DEFAULT_NEW_NAME, type MutableKind, type MutateRequest } from '@shared/mutate'
import { errText } from '@shared/result'
import { buildReconcileIndex, reconcileSelection, reconcileWith } from './selection'
import {
  insertCreatedInTree,
  patchContextGroupsInTree,
  patchNodeInTree,
  relocateNodeInTree,
  removeNodeInTree,
  renameNodeInTree,
  reorderChildrenInTree,
  reorderTopInTree,
} from './treeMove'
import {
  closeTabIn,
  deriveTarget,
  openTabIn,
  reorderTabIn,
  type PreviewState,
  type PreviewTab,
} from './PagePreview/previewTabs'
import {
  moveByKey,
  navKey,
  recordRecent,
  removeRecentByKey,
  toNavRef,
  RECENTS_CAP,
} from './Navigation/navRecents'
import { existingNavKeys } from './Navigation/treeNavKeys'
import {
  activeUnpinnedTab,
  closeTab as closeTabModel,
  derivePinnedTabs,
  insertUnpinned,
  hydrateTabs,
  isPinned,
  liveTarget,
  newTabTab,
  openNewTab as openNewTabModel,
  openTab as openTabModel,
  pinTabId,
  pushMru,
  reconcileTabs,
  reorderWithinZone,
  tabKey,
} from './Tabs/tabsModel'
import { captureWarm, clearWarm, dropWarmTab, readWarm } from './Tabs/warmCache'
import { clearPreviewWarm, dropPreviewWarm } from './PagePreview/previewWarm'
import { stashWindowMorph } from './PagePreview/WindowMorph'
import { flushAllPageSaves } from './Detail/pageFlush'
import { dropCapturedOutside } from './Navigation/useNavThumbnails'
import { stabilize } from './treeStabilize'
import { applyAccent, applySystemAccent } from './design-system/accent'
import { applyPersonalization, applyPersonalizationKey } from './design-system/personalization'
import { findCollection, findSet, findCollectionForSet, isDepth1Set } from './Detail/Scope'
import { ensureContainerView } from './Detail/Views/viewMint'
import { normalizePropertyName, wrapKey } from '@shared/governedKeys'

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

// `SelectTarget` (what a sidebar row or tab hands to `select`) is the shared drivable-target type,
// re-exported so existing `../store` importers keep resolving it.
export type { SelectTarget }

export type PreviewTarget = { id: string; path: string }

export interface TrailEntry {
  id: string
  path: string
  title: string
}

function findContainerPath(tree: NexusTree, id: string): string | null {
  const cols = [...(tree.collections ?? [])]
  const inSets = (sets: SetNode[] | undefined): string | null => {
    for (const s of sets ?? []) {
      if (s.id === id) return s.path
      const deep = inSets(s.sets)
      if (deep) return deep
    }
    return null
  }
  for (const c of cols) {
    if (c.id === id) return c.path
    const hit = inSets(c.sets)
    if (hit) return hit
  }
  return null
}

type PageStatus = 'idle' | 'loading' | 'ready' | 'error'

interface SessionState {
  status: 'idle' | 'loading' | 'ready' | 'error' | 'empty'
  tree: NexusTree | null
  error?: string
  sidebarVisible: boolean
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
  personalization: Personalization
  setPersonalization: <K extends keyof Personalization>(key: K, value: Personalization[K]) => void
  trail: Record<string, TrailEntry>
  recordTrail: (containerId: string, entry: TrailEntry) => void
  linkTitles: Record<string, string>
  resolveLinkTitle: (url: string) => void
  activeViews: Record<string, string>
  setActiveView: (containerId: string, viewId: string) => Promise<void>
  /** Every block host's lock, keyed by host. Seeded from the doc the host loads — the one source. */
  hostLocks: Record<string, boolean>
  seedHostLock: (host: BlockHostRef, locked: boolean) => void
  setHostLocked: (host: BlockHostRef, v: boolean) => Promise<void>
  load: () => Promise<void>
  applyTree: (tree: NexusTree) => Promise<void>
  choose: () => Promise<void>
  openDropped: (file: File) => Promise<void>
  toggleSidebar: () => void

  selection: SelectionState
  pageStatus: PageStatus
  pageFrozen: boolean
  pageDetail: PageDetail | null
  pageError?: string
  liveBody: { path: string; body: string } | null
  setLiveBody: (path: string, body: string) => void
  /** `{ record: false }` refreshes the shown detail without touching the tab set or recents
   *  (Back/Forward, a path refetch, a tab activation, a preview open). `{ newTab: true }` forces a new tab. */
  select: (target: SelectTarget, opts?: { record?: boolean; newTab?: boolean }) => Promise<void>
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
  navSlide: {
    tabId: string
    dir: 'back' | 'forward'
    seq: number
    source: 'history' | 'tab' | 'select'
  } | null

  recents: NavRef[]
  favorites: NavRef[]
  pinned: NavRef[]
  /** The pinned refs hydrated against the live tree — derived state with exactly four writers
   *  (load, tree push, nav push, pin gestures), so hot readers never rebuild the index. */
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
  agendaSnapshot: { tasks: AgendaEntry[]; events: AgendaEntry[] } | null
  ensureAgendaSnapshot: () => Promise<void>
  navOpen: boolean
  openNav: () => void
  closeNav: () => void
  toggleNav: () => void

  settingsOpen: boolean
  openSettings: () => void
  closeSettings: () => void

  preview: PreviewState | null
  previewsFile: PreviewsFile
  previewTarget: PreviewTarget | null
  previewSlide: { dir: 'back' | 'fwd'; seq: number } | null
  openPreview: (target: PreviewTarget) => void
  openNavPreview: () => void
  openPreviewTab: (target: PreviewTarget) => void
  activatePreviewTab: (id: string) => void
  reorderPreviewTabs: (activeId: string, overId: string) => void
  closePreviewTab: (id: string, exit?: 'dismiss' | 'engulf') => void
  closePreview: (reason?: 'dismiss' | 'engulf') => void
  setNavOverride: (on: boolean) => void
  previewExit: 'dismiss' | 'engulf' | 'morph'

  reloadPage: () => Promise<void>
  newPage: () => Promise<void>
  createFromMenu: (items: { label: string; req: MutateRequest }[]) => Promise<void>

  renamingPath: string | null
  beginRename: (path: string) => void
  cancelRename: () => void
  submitRename: (path: string, kind: MutableKind, newName: string) => Promise<boolean>

  renamingProperty: { collectionPath: string; propertyId: string } | null
  /** Set when a property rename lands. A mounted view's values snapshot is fetched once per
   *  container open and never re-reads, so without this the renamed column reads blank until the
   *  user navigates away. Carries the key pair because the effect must RE-KEY the optimistic
   *  overrides too — clearing them would revive the assign-vanish this codebase already fixed. */
  valuesEpoch: { n: number; oldKey: string; newKey: string } | null
  bumpValuesEpoch: (oldKey: string, newKey: string) => void
  beginPropertyRename: (target: { collectionPath: string; propertyId: string }) => void
  cancelPropertyRename: () => void
  submitPropertyRename: (newName: string) => Promise<boolean>
  mutate: (
    req: MutateRequest,
    onCreated?: (created: { id: string; path: string }) => void | Promise<void>,
  ) => Promise<boolean>
}

function sameShownTarget(sel: SelectionState, t: SelectTarget): boolean {
  if (sel.kind !== t.kind) return false
  if (sel.kind === 'homepage') return true
  if (sel.kind === 'page') return t.kind === 'page' && sel.id === t.id && sel.path === t.path
  return 'id' in t && 'id' in sel && sel.id === t.id
}

let pageFetchSeq = 0
const COLD_SWAP_DEADLINE = 200
// Clearing this must target exactly the stamp the superseded fetch was carrying (never a newer one) —
// otherwise a later stampless selection change replays the abandoned slide.
let coldStampSeq = -1

let systemAccentCache: string | null | undefined

export const useSession = create<SessionState>((set, get) => {
  // Clearing activeTabId marks the tab set never-seeded, so load() re-reads the new nexus's sidecars.
  const resetNexusSession = (): void => {
    pageFetchSeq++
    set({
      selection: { kind: 'none' },
      pageStatus: 'idle',
      pageDetail: null,
      pageError: undefined,
      pageFrozen: false,
      liveBody: null,
      tabs: [],
      activeTabId: '',
      tabMru: [],
      navOpen: false,
      preview: null,
      previewsFile: EMPTY_PREVIEWS,
      previewTarget: null,
      previewSlide: null,
      // Defaults here so a nexus without the setting can't inherit the previous one's.
      subfieldExpanded: true,
      subfieldOrder: {},
      navWindowMode: 'list',
      navViewMode: 'list',
    })
    clearWarm()
    clearPreviewWarm()
  }

  const openVia = async (attempt: () => Promise<boolean>): Promise<void> => {
    try {
      // Close before the root can flip, even if the adopt is then cancelled — data safety
      // beats window persistence.
      set({ navOpen: false, preview: null, previewTarget: null })
      // Flush every pending page-body write to the CURRENT nexus before an adopt flips the root —
      // else a debounce timer or an embed's exit flush landing after the flip binds the NEW nexus
      // and overwrites a same-relative-path file there. Awaited so main binds the old root.
      await flushAllPageSaves()
      if (await attempt()) {
        resetNexusSession()
        await get().load()
      }
    } catch (e) {
      set({ status: 'error', error: errText(e) })
    }
  }

  const inFlightTitles = new Set<string>()
  const failedTitles = new Set<string>()

  const makeTabId = (): string => crypto.randomUUID()

  let previewSlideSeq = 0
  const stampByOrder = (
    cur: PreviewState,
    nextId: string,
  ): { dir: 'back' | 'fwd'; seq: number } => {
    const from = cur.tabs.findIndex((t) => t.id === cur.activeTabId)
    const to = cur.tabs.findIndex((t) => t.id === nextId)
    return { dir: to < from ? 'back' : 'fwd', seq: ++previewSlideSeq }
  }

  const toPreviewRecord = (p: PreviewState): PreviewSetRecord => ({
    tabs: p.tabs.map((t) => ({
      target: t.target.kind === 'navwindow' ? t.target : toNavRef(t.target),
    })),
    activeIndex: Math.max(
      0,
      p.tabs.findIndex((t) => t.id === p.activeTabId),
    ),
  })

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

  const savePreviewsFile = (file: PreviewsFile): void => {
    set({ previewsFile: file })
    void (window as { nexus?: typeof window.nexus }).nexus?.previews
      ?.save(file)
      .catch(() => undefined)
  }

  const reconcileRecord = (
    rec: PreviewSetRecord | null | undefined,
  ): { tabs: PreviewTab[]; activeTab: PreviewTab | null } => {
    if (!rec) return { tabs: [], activeTab: null }
    const tree = get().tree
    const index = tree ? buildReconcileIndex(tree) : null
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
    set({ preview: next, previewTarget: deriveTarget(next), ...extra })
    const retire =
      prev && prev.flavor === 'page' && prev.originId !== next?.originId ? prev.originId : undefined
    mirrorPreviews(retire)
  }

  const findActiveTab = (): Tab | undefined => {
    const s = get()
    return (
      s.tabs.find((t) => t.id === s.activeTabId) ??
      s.pinnedTabs.find((t) => t.id === s.activeTabId)
    )
  }

  const syncActiveDetail = (): void => {
    const active = findActiveTab()
    if (!active || active.target.kind === 'newtab') {
      pageFetchSeq++
      set({
        selection: { kind: 'none' },
        pageStatus: 'idle',
        pageDetail: null,
        pageError: undefined,
        pageFrozen: false,
      })
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

  const applyTabResult = (r: { tabs: Tab[]; activeTabId: string; mru: string[] }): void => {
    const activeChanged = r.activeTabId !== get().activeTabId
    set({ tabs: r.tabs, activeTabId: r.activeTabId, tabMru: r.mru })
    if (activeChanged) syncActiveDetail()
    persistTabs()
  }

  // The pin gestures' writer — one of pinnedTabs' four (load, tree push, nav push, here).
  const commitPinned = (pinned: NavRef[]): void => {
    const tree = get().tree
    set({ pinned, pinnedTabs: derivePinnedTabs(pinned, tree ? buildReconcileIndex(tree) : null) })
    void window.nexus.nav.write({ pinned })
  }

  // In-memory recents lead disk everywhere; the persist rides along so the two can't part.
  const commitRecents = (recents: NavRef[]): void => {
    set({ recents })
    void window.nexus.nav.write({ recents })
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

  // Must run before select() mutates state — pageDetail nulls synchronously, so capturing any
  // later would read the incoming tab's state instead of the outgoing one's.
  const captureOutgoingDetail = (): void => {
    const s = get()
    if (s.selection.kind !== 'page' || s.pageStatus !== 'ready' || !s.pageDetail) return
    // pageDetail.body is the load snapshot (autosave never updates it) — fold in the live buffer
    // or a warm return shows pre-edit stats in the Subfield.
    const body = s.liveBody?.path === s.selection.path ? s.liveBody.body : s.pageDetail.body
    const detail = body === s.pageDetail.body ? s.pageDetail : { ...s.pageDetail, body }
    captureWarm(s.activeTabId, navKey(s.selection), { pageDetail: detail })
  }

  const stepActiveHistory = (delta: number): void => {
    const s = get()
    const active = activeUnpinnedTab(s.tabs, s.activeTabId)
    if (!active || active.target.kind === 'newtab') return
    for (let i = active.navIndex + delta; i >= 0 && i < active.navStack.length; i += delta) {
      const resolved = s.tree ? reconcileSelection(s.tree, active.navStack[i]) : active.navStack[i]
      if (resolved.kind === 'none') continue
      captureOutgoingDetail()
      // target must move in lockstep with navIndex — openTab's dedup keys off target, so a stale
      // one would mis-dedup the very next click on the shown entity, destroying the Forward stack.
      set({
        tabs: get().tabs.map((t) =>
          t.id === active.id ? { ...t, navIndex: i, target: resolved } : t,
        ),
        navSlide: {
          tabId: active.id,
          dir: delta < 0 ? 'back' : 'forward',
          seq: (s.navSlide?.seq ?? 0) + 1,
          source: 'history',
        },
      })
      void get().select(resolved, { record: false })
      persistTabs()
      return
    }
  }

  return {
    status: 'idle',
    tree: null,
    error: undefined,
    hostLocks: {},
    seedHostLock: (host, locked) =>
      set((s) => {
        const key = blockHostKey(host)
        return s.hostLocks[key] === locked ? {} : { hostLocks: { ...s.hostLocks, [key]: locked } }
      }),
    setHostLocked: async (host, v) => {
      set((s) => ({ hostLocks: { ...s.hostLocks, [blockHostKey(host)]: v } }))
      await window.nexus.blocks.save(host, { locked: v })
    },
    load: async () => {
      // Only the FIRST load shows the full-screen loading state — a mutation refetch keeps the
      // tree mounted so the sidebar's expand/collapse + selection survive instead of resetting.
      if (!get().tree) set({ status: 'loading', error: undefined })
      void window.nexus.systemAccent().then((c) => {
        systemAccentCache = c
      })
      try {
        const res = await window.nexus.state()
        switch (res.status) {
          case 'open':
            await get().applyTree(res.tree)
            // Six independent fetches, one round of latency. The two raw database reads keep
            // a catch; the envelope channels structurally cannot reject.
            await Promise.all([
              window.nexus.subfield.get().then((cfg) => {
                if (cfg) set({ subfieldExpanded: cfg.expanded, subfieldOrder: cfg.order })
              }),
              window.nexus.navViewModes.get().then((modes) => {
                if (modes) set({ navWindowMode: modes.window, navViewMode: modes.view })
              }),
              window.nexus.linkTitles
                .get()
                .then((titles) => set({ linkTitles: titles }))
                .catch(() => undefined), // url cells fall back to the domain
              window.nexus.activeViews
                .get()
                .then((views) => set({ activeViews: views }))
                .catch(() => undefined), // surfaces fall back to the first saved view
            ])
            set({ agendaSnapshot: null })
            // A mutation refetch must NOT re-read the sidecar here — its debounced write trails
            // the in-memory tab set, so a re-read would roll the tabs backward.
            if (get().activeTabId === '') {
              // Disk leads exactly here (the first load) and on the external-edit push — a
              // mutation-driven load() never re-reads navigation, so a just-made change can't
              // roll back.
              const read = await window.nexus.nav.read().catch(() => null)
              const nav = read?.ok ? read.nav : null
              const pinned = nav?.pinned ?? []
              const restoreTree = get().tree
              const restoreIndex = restoreTree ? buildReconcileIndex(restoreTree) : null
              set({
                pinned,
                pinnedTabs: derivePinnedTabs(pinned, restoreIndex),
                favorites: nav?.favorites ?? [],
                recents: nav?.recents ?? [],
                navBanner: nav?.banner,
              })
              get().evictThumbs()
              const previews = await window.nexus.previews?.load().catch(() => null)
              if (previews?.ok) set({ previewsFile: previews.file })
              const stored = await window.nexus.tabs.load().catch(() => null)
              const storedSet = stored?.ok ? stored.set : null
              const seen = new Set<string>()
              const storedTabs = (storedSet?.tabs ?? []).filter((t) => {
                if (t.target.kind !== 'newtab' && isPinned(t.target, pinned)) return false
                const k = tabKey(t.target)
                if (seen.has(k)) return false
                seen.add(k)
                return true
              })
              // ONE hydration pass owns the restore: dead refs prune, paths mint, the history
              // pointer recomputes. The derived pinned set is already live by construction.
              const tabs = hydrateTabs(storedTabs, restoreIndex)
              const livePinnedTabs = get().pinnedTabs
              const storedActive = storedSet?.activeTabId ?? ''
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
            }
            break
          case 'empty':
            set({ status: 'empty', tree: null })
            break
          case 'error':
            set({ status: 'error', error: res.error })
            break
        }
      } catch (e) {
        set({ status: 'error', error: errText(e) })
      }
    },

    applyTree: async (incoming) => {
      // A tree from a DIFFERENT nexus (the menu's reload-state adopts in main and never runs
      // openVia's clear) must wipe the per-nexus session state before any reconcile below can
      // mirror the old nexus's tabs/previews into the new one's synced sidecars.
      const prevRoot = get().tree?.nexus.rootPath
      if (prevRoot !== undefined && prevRoot !== incoming.nexus.rootPath) resetNexusSession()
      // IPC strips identity, so without stabilize() every push would re-render every consumer —
      // an echo lands as the same tree (a zustand no-op); an unrelated change keeps the open
      // container's identity and its memoized pipeline.
      const tree = stabilize(incoming, get().tree)
      set({ status: 'ready', tree })
      const index = buildReconcileIndex(tree)
      // Tree push = pinned hydration writer #2: renames re-title, moves re-path, deletes drop.
      set({ pinnedTabs: derivePinnedTabs(get().pinned, index) })
      const prev = get().selection
      const next = reconcileWith(index, prev)
      if (next !== prev) {
        if (next.kind === 'none') {
          pageFetchSeq++
          set({
            selection: next,
            pageStatus: 'idle',
            pageDetail: null,
            pageError: undefined,
            pageFrozen: false,
          })
        } else if (next.kind === 'page') {
          void get().select(next, { record: false })
        }
      }
      {
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
      }
      // A deleted page's flush would hit a dead path, which the crud guard refuses — the stale
      // body is never written anywhere.
      {
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
            for (const id of deadIds) dropPreviewWarm(id)
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
        const file = get().previewsFile
        const dead = Object.keys(file.origins).filter(
          (id) => reconcileWith(index, { kind: 'page', id, path: '' }).kind === 'none',
        )
        if (dead.length > 0) {
          const origins = { ...file.origins }
          for (const id of dead) delete origins[id]
          savePreviewsFile({ ...file, origins })
        }
      }
      // Read from the module cache, not an awaited IPC call — applyTree runs on every watcher
      // push, and a round-trip here would gate the whole reconcile behind it. load() refreshes it.
      if (systemAccentCache === undefined) systemAccentCache = await window.nexus.systemAccent()
      const systemColor = systemAccentCache
      applyAccent(tree.accent, systemColor)
      applySystemAccent(systemColor)
      set({ personalization: tree.personalization, commands: tree.commands })
      applyPersonalization(tree.personalization)
      if (get().agendaSnapshot) set({ agendaSnapshot: null })
    },

    choose: () => openVia(() => window.nexus.choose()),

    openDropped: (file) => openVia(() => window.nexus.openDropped(file)),

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

    subfieldExpanded: true,
    setSubfieldExpanded: (expanded) => {
      set({ subfieldExpanded: expanded })
      const s = get()
      void window.nexus.subfield
        .set({ order: s.subfieldOrder, expanded: s.subfieldExpanded })
        .catch(() => undefined)
    },
    subfieldOrder: {},
    setSubfieldOrder: (kind, ids) => {
      set((s) => ({ subfieldOrder: { ...s.subfieldOrder, [kind]: ids } }))
      const s = get()
      void window.nexus.subfield
        .set({ order: s.subfieldOrder, expanded: s.subfieldExpanded })
        .catch(() => undefined)
    },

    navWindowMode: 'list',
    setNavWindowMode: (mode) => {
      set({ navWindowMode: mode })
      const s = get()
      void window.nexus.navViewModes
        .set({ window: s.navWindowMode, view: s.navViewMode })
        .catch(() => undefined)
    },
    navViewMode: 'list',
    setNavViewMode: (mode) => {
      set({ navViewMode: mode })
      const s = get()
      void window.nexus.navViewModes
        .set({ window: s.navWindowMode, view: s.navViewMode })
        .catch(() => undefined)
    },
    personalization: {},
    setPersonalization: (key, value) => {
      // One writer, both projections — but the tree copy re-identifies only for defaultIcons,
      // the one key tree-keyed derivations (nav icons, context identity) actually resolve:
      // a new tree identity re-runs every tree memo, thumbnail gate and pipeline, which a
      // boolean toggle must never cost. Everything else reads the slice.
      set((s) => ({
        personalization: { ...s.personalization, [key]: value },
        tree:
          s.tree && key === 'defaultIcons'
            ? { ...s.tree, personalization: { ...s.tree.personalization, [key]: value } }
            : s.tree,
      }))
      applyPersonalizationKey(key, value)
      void window.nexus.personalization.set(key, value)
    },
    trail: {},
    recordTrail: (containerId, entry) =>
      set((s) => ({ trail: { ...s.trail, [containerId]: entry } })),

    linkTitles: {},
    resolveLinkTitle: (url) => {
      if (inFlightTitles.has(url) || failedTitles.has(url) || get().linkTitles[url]) return
      inFlightTitles.add(url)
      window.nexus.linkTitles
        .fetch(url)
        .then((res) => {
          // A late fetch resolving after a nexus switch merges into the new map harmlessly: a URL's
          // <title> is identical in any nexus, and main won't persist it cross-nexus (cacheRoot === root).
          const title = res.ok ? res.title : null
          if (title) set((s) => ({ linkTitles: { ...s.linkTitles, [url]: title } }))
          else failedTitles.add(url)
        })
        .catch(() => failedTitles.add(url))
        .finally(() => inFlightTitles.delete(url))
    },

    activeViews: {},
    setActiveView: async (containerId, viewId) => {
      await window.nexus.activeViews.set(containerId, viewId)
      set((s) => ({ activeViews: { ...s.activeViews, [containerId]: viewId } }))
    },

    selection: { kind: 'none' },
    pageStatus: 'idle',
    pageFrozen: false,
    pageDetail: null,
    pageError: undefined,
    liveBody: null,
    setLiveBody: (path, body) => set({ liveBody: { path, body } }),
    tabs: [],
    activeTabId: '',
    tabMru: [],
    goBack: () => stepActiveHistory(-1),
    goForward: () => stepActiveHistory(1),
    navSlide: null,
    activateTab: (id) => {
      const s = get()
      if (s.activeTabId === id) return
      captureOutgoingDetail()
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
      captureOutgoingDetail()
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

    recents: [],
    favorites: [],
    pinned: [],
    pinnedTabs: [],
    navBanner: undefined,
    pinTarget: (target) => {
      // Agenda kinds have no durable resolver yet; adopted ids would re-mint under a new id.
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
      const pinned = nav.pinned ?? []
      const tree = get().tree
      set({
        pinned,
        pinnedTabs: derivePinnedTabs(pinned, tree ? buildReconcileIndex(tree) : null),
        favorites: nav.favorites ?? [],
        navBanner: nav.banner,
      })
      graduatePinCovered()
      // A synced-in unpin can orphan the active pointer (graduatePinCovered only handles the add
      // case) — refocus MRU-top so it doesn't dangle onto a stale pane.
      const s = get()
      const live = new Set([
        ...s.pinnedTabs.map((t) => t.id),
        ...s.tabs.map((t) => t.id),
      ])
      if (!live.has(s.activeTabId)) {
        const focus =
          s.tabMru.find((id) => live.has(id)) ?? s.tabs[0]?.id ?? s.pinnedTabs[0]?.id
        if (focus !== undefined) {
          set({
            activeTabId: focus,
            tabMru: pushMru(
              s.tabMru.filter((id) => live.has(id)),
              focus,
            ),
          })
          syncActiveDetail()
        }
      }
    },
    thumbVersions: {},
    bumpThumb: (key) =>
      set((s) => ({
        thumbVersions: { ...s.thumbVersions, [key]: (s.thumbVersions[key] ?? 0) + 1 },
      })),
    evictThumbs: () => {
      const tree = get().tree
      if (!tree) return
      // recents/pins backstop the tree's fs walk, which can read a subtree as empty on a
      // transient error — this keeps a just-visited entity from a false-empty eviction.
      const live = [
        ...existingNavKeys(tree),
        ...get().recents.map(navKey),
        ...get().pinned.map(navKey),
      ]
      dropCapturedOutside(new Set(live))
      void window.nexus.capture.evict(live)
    },
    addFavorite: (target) => {
      // v1 favorites are tree kinds only — an agenda favorite would resolve to null and render
      // as an invisible, un-removable entry until the agenda resolver ships.
      if (target.kind === 'task' || target.kind === 'event') return
      const ref = toNavRef(target)
      const key = navKey(ref)
      if (get().favorites.some((f) => navKey(f) === key)) return
      const favorites = [...get().favorites, ref]
      set({ favorites })
      void window.nexus.nav.write({ favorites })
    },
    removeFavorite: (key) => {
      const favorites = get().favorites.filter((f) => navKey(f) !== key)
      set({ favorites })
      void window.nexus.nav.write({ favorites })
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
    agendaSnapshot: null,
    ensureAgendaSnapshot: async () => {
      if (get().agendaSnapshot) return
      try {
        const res = await window.nexus.agenda.list()
        if (res.ok) set({ agendaSnapshot: { tasks: res.tasks, events: res.events } })
      } catch {
        // search runs over the tree alone until the next attempt
      }
    },
    navOpen: false,
    openNav: () => {
      void get().ensureAgendaSnapshot()
      set({ navOpen: true })
      get().openNavPreview()
    },
    closeNav: () => {
      clearPreviewWarm()
      set({ navOpen: false, preview: null, previewTarget: null })
      mirrorPreviews()
    },
    toggleNav: () => {
      if (get().navOpen) get().closeNav()
      else get().openNav()
    },
    settingsOpen: false,
    openSettings: () => set({ settingsOpen: true }),
    closeSettings: () => set({ settingsOpen: false }),
    preview: null,
    previewsFile: EMPTY_PREVIEWS,
    previewTarget: null,
    previewSlide: null,
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
      clearPreviewWarm()
      // previewExit re-seeds on every open — only the close that wrote 'engulf' may play the FLIP;
      // the other window-closing paths never write the flag.
      set({ preview, previewTarget: deriveTarget(preview), navOpen: false, previewExit: 'dismiss' })
      mirrorPreviews()
    },
    openNavPreview: () => {
      const cur = get().preview
      if (cur?.flavor === 'nav') return
      // A live page preview morphs into the NavWindow (one window changing shape, never a
      // dismiss + fresh open) — its rect is stashed for the nav's mount FLIP, and the 'morph'
      // exit hides the outgoing window instantly so the nav carries the whole motion.
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
      clearPreviewWarm()
      set({
        preview,
        previewTarget: deriveTarget(preview),
        previewExit: morphing ? 'morph' : 'dismiss',
      })
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
    previewExit: 'dismiss',
    closePreviewTab: (id, exit) => {
      const cur = get().preview
      if (!cur) return
      const next = closeTabIn(cur, id)
      if (next === cur) return
      if (next === null) {
        clearPreviewWarm()
        set({ previewExit: exit ?? 'dismiss' })
      } else dropPreviewWarm(id)
      commitPreview(next)
    },
    closePreview: (reason) => {
      clearPreviewWarm()
      set({ preview: null, previewTarget: null, previewExit: reason ?? 'dismiss' })
      mirrorPreviews()
    },
    select: async (target, opts) => {
      pageFetchSeq++
      if (get().pageFrozen) {
        const s = get()
        set(
          s.navSlide?.seq === coldStampSeq
            ? { pageFrozen: false, navSlide: null }
            : { pageFrozen: false },
        )
      }
      if (opts?.record !== false) {
        captureOutgoingDetail()
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
          set({
            selection: { kind: 'homepage' },
            pageStatus: 'idle',
            pageDetail: null,
            pageError: undefined,
          })
          return
        case 'context':
          set({
            selection: { kind: 'context', id: target.id },
            pageStatus: 'idle',
            pageDetail: null,
            pageError: undefined,
          })
          return
        case 'space':
          set({
            selection: { kind: 'space', id: target.id },
            pageStatus: 'idle',
            pageDetail: null,
            pageError: undefined,
          })
          return
        case 'collection': {
          set({
            selection: { kind: 'collection', id: target.id },
            pageStatus: 'idle',
            pageDetail: null,
            pageError: undefined,
          })
          const col = findCollection(get().tree, target.id)
          if (col) ensureContainerView(col, col.properties ?? [], get().load)
          return
        }
        case 'set': {
          set({
            selection: { kind: 'set', id: target.id, path: target.path },
            pageStatus: 'idle',
            pageDetail: null,
            pageError: undefined,
          })
          const setNode = findSet(get().tree, target.id)
          if (setNode && isDepth1Set(get().tree, target.id))
            ensureContainerView(
              setNode,
              findCollectionForSet(get().tree, target.id)?.properties ?? [],
              get().load,
            )
          return
        }
        case 'page': {
          // The path equality keeps a warm return honest across renames — a stale-path detail
          // would route saves at the old file.
          const cached = readWarm(get().activeTabId, navKey(target))?.pageDetail
          if (cached && cached.path === target.path) {
            set({
              selection: { kind: 'page', id: target.id, path: target.path },
              pageStatus: 'ready',
              pageDetail: cached,
              pageError: undefined,
              liveBody: { path: cached.path, body: cached.body },
            })
            return
          }
          // Pause-on-change: the outgoing view holds frozen until the fetch lands or
          // COLD_SWAP_DEADLINE passes; the seq fence drops a stale response after a newer navigation.
          const seq = pageFetchSeq
          coldStampSeq = get().navSlide?.seq ?? -1
          const pageSel = { kind: 'page' as const, id: target.id, path: target.path }
          set({ pageFrozen: true })
          const fallback = setTimeout(() => {
            if (seq !== pageFetchSeq) return
            set({
              selection: pageSel,
              pageStatus: 'loading',
              pageDetail: null,
              pageError: undefined,
              pageFrozen: false,
            })
          }, COLD_SWAP_DEADLINE)
          let res: Awaited<ReturnType<typeof window.nexus.openPage>>
          try {
            res = await window.nexus.openPage(target.path)
          } catch (e) {
            res = { ok: false, error: errText(e) }
          }
          clearTimeout(fallback)
          if (seq !== pageFetchSeq) return
          if (res.ok) {
            set({
              selection: pageSel,
              pageStatus: 'ready',
              pageDetail: res.page,
              pageError: undefined,
              pageFrozen: false,
            })
          } else {
            set({
              selection: pageSel,
              pageStatus: 'error',
              pageDetail: null,
              pageError: res.error,
              pageFrozen: false,
            })
          }
          return
        }
      }
    },

    reloadPage: async () => {
      const { selection } = get()
      if (selection.kind !== 'page') return
      const res = await window.nexus.openPage(selection.path).catch(() => null)
      if (res?.ok) set({ pageDetail: res.page })
    },

    newPage: async () => {
      const { tree, selection } = get()
      if (!tree) return
      // Page paths are POSIX, so the parent is the path minus its last segment.
      let parentPath: string | null = null
      if (selection.kind === 'collection' || selection.kind === 'set')
        parentPath = findContainerPath(tree, selection.id)
      else if (selection.kind === 'page')
        parentPath = selection.path.split('/').slice(0, -1).join('/')
      if (parentPath === null) {
        parentPath = (tree.collections ?? [])[0]?.path ?? null
      }
      if (parentPath === null) return
      // main disambiguates the name on collision.
      await get().mutate({ op: 'createPage', parentPath, name: DEFAULT_NEW_NAME }, (created) =>
        get().select({ kind: 'page', id: created.id, path: created.path }),
      )
    },

    createFromMenu: async (items) => {
      const req = await window.nexus.popCreateMenu(items)
      if (req) await get().mutate(req, (created) => get().beginRename(created.path))
    },

    renamingPath: null,
    beginRename: (path) => set({ renamingPath: path }),
    cancelRename: () => set({ renamingPath: null }),
    submitRename: async (path, kind, newName) => {
      set({ renamingPath: null })
      // Registry entities rename by id through their journaled cascade ops — a bare folder
      // rename would strand every member file's title key.
      if (kind === 'space' || kind === 'context') {
        const groups = get().tree?.contexts ?? []
        if (kind === 'space') {
          const sp = groups.flatMap((g) => g.spaces).find((s) => s.path === path)
          return sp ? get().mutate({ op: 'renameSpace', spaceId: sp.id, newName }) : false
        }
        const group = groups.find((g) => `.nexus/contexts/${g.def.title}` === path)
        return group
          ? get().mutate({ op: 'renameContext', contextId: group.def.id, newName })
          : false
      }
      return get().mutate({ op: 'rename', path, kind, newName })
    },

    renamingProperty: null,
    valuesEpoch: null,
    bumpValuesEpoch: (oldKey, newKey) =>
      set((st) => ({ valuesEpoch: { n: (st.valuesEpoch?.n ?? 0) + 1, oldKey, newKey } })),
    beginPropertyRename: (target) => set({ renamingProperty: target }),
    cancelPropertyRename: () => set({ renamingProperty: null }),
    submitPropertyRename: async (newName) => {
      const target = get().renamingProperty
      set({ renamingProperty: null })
      if (!target) return false
      const res = await window.nexus.schema.rename(
        target.collectionPath,
        target.propertyId,
        newName,
      )
      if (!res.ok) {
        await window.nexus.showError(res.error)
        return false
      }
      const before = get().tree?.registry.find((d) => d.id === target.propertyId)?.name
      const after = normalizePropertyName(newName)
      await get().load()
      if (before !== undefined && before !== after)
        get().bumpValuesEpoch(wrapKey('property', before), wrapKey('property', after))
      return true
    },
    mutate: async (req, onCreated) => {
      const res = await window.nexus.mutate(req)
      if (!res.ok) {
        await window.nexus.showError(res.error.message)
        return false
      }
      // Instant optimistic patch; load() below confirms canon with no flicker (stabilize()
      // makes a matching reload a no-op).
      const cur = get().tree
      let patched: NexusTree | null = null
      if (cur) {
        switch (req.op) {
          case 'movePage':
          case 'moveSet':
            patched = relocateNodeInTree(cur, req.path, req.newParentPath)
            break
          case 'rename':
            patched = renameNodeInTree(cur, req.path, req.newName)
            break
          case 'delete':
            patched = removeNodeInTree(cur, req.path)
            break
          case 'reorderChildren':
            patched = reorderChildrenInTree(cur, req.parentPath, req.order)
            break
          case 'reorderTop':
            patched = reorderTopInTree(cur, req.key, req.order)
            break
          case 'setIcon':
            patched = patchNodeInTree(cur, req.path, { icon: req.icon })
            break
          case 'setHeadingIconHidden':
            patched =
              req.kind === 'homepage'
                ? { ...cur, homepage: { ...cur.homepage, headingIconHidden: req.hidden } }
                : req.kind === 'navview'
                  ? null
                  : patchNodeInTree(cur, req.path, { headingIconHidden: req.hidden })
            break
          case 'renameContext':
          case 'renameSpace':
          case 'setSpaceColor':
          case 'reorderContexts':
          case 'reorderSpaces':
            patched = patchContextGroupsInTree(cur, req)
            break
        }
        if (patched) await get().applyTree(patched)
      }
      // Without this optimistic create, the rename input only mounts after the full re-walk,
      // eating the user's first keystrokes on a large vault.
      let createdShown = false
      if (cur && res.created && onCreated) {
        const optimistic = insertCreatedInTree(cur, req, res.created)
        if (optimistic) {
          await get().applyTree(optimistic)
          await onCreated(res.created)
          createdShown = true
        }
      }
      // Value-only writes never change the tree (the caller's optimistic patch already shows the
      // change) — skip the full-nexus re-walk for them, the "reload the entire Y" hot path this
      // codebase forbids.
      if (req.op !== 'setProperty' && req.op !== 'setContext') await get().load()
      if (!createdShown && res.created && onCreated) await onCreated(res.created)
      return true
    },
  }
})
