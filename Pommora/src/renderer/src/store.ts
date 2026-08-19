import { create } from 'zustand'
import { blockHostKey, type BlockHostRef } from '@shared/blocks'
import {
  EMPTY_PREVIEWS,
  DEFAULT_COMMANDS,
  type CollectionNode,
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
import {
  type Creator,
  DEFAULT_NEW_NAME,
  type MutableKind,
  type MutateRequest,
  type RenameHost,
} from '@shared/mutate'
import { orderWithSlot } from './Detail/Views/creationOrder'
import { caught, errText, fail, type PommoraError, type Result } from '@shared/result'
import { reconcileSelection, reconcileWith } from './selection'
import { navKeysOf, reconcileIndexOf } from './treeIndex'
import {
  insertCreatedInTree,
  patchContextGroupsInTree,
  patchNodeInTree,
  relocateNodeInTree,
  reorderPagesInTree,
  removeNodeInTree,
  renameNodeInTree,
  reorderChildrenInTree,
  reorderTopInTree,
} from '@shared/treePatch'
import {
  closeTabIn,
  deriveTarget,
  openTabIn,
  reorderTabIn,
  type PreviewState,
  type PreviewTab,
} from './PagePreview/previewTabs'
import { toNavRef } from '@shared/types'
import {
  moveByKey,
  navKey,
  recordRecent,
  removeRecentByKey,
  RECENTS_CAP,
} from './Navigation/navRecents'
import {
  activeUnpinnedTab,
  closeTab as closeTabModel,
  derivePinnedTabs,
  insertUnpinned,
  hydrateTabs,
  isPinned,
  sameTabs,
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
import {
  captureWarm,
  clearWarm,
  dropPageDetail,
  dropWarmDetail,
  dropWarmTab,
  readWarm,
} from './Tabs/warmCache'
import { clearPreviewWarm, dropPreviewWarm } from './PagePreview/previewWarm'
import { stashWindowMorph } from './PagePreview/WindowMorph'
import { flushAllPageSaves } from './Detail/pageFlush'
import { dropCapturedOutside } from './Navigation/useNavThumbnails'
import { stabilize } from '@shared/treeStabilize'
import { applyAccent, applySystemAccent } from './design-system/accent'
import type { DevicePrefs } from '@shared/devicePrefs'
import { applyPersonalization, applyPersonalizationKey } from './design-system/personalization'
import { findCollection, findSet, findCollectionForSet, isDepth1Set } from './Detail/Scope'
import { crumbDepthFor } from './Detail/Subfield/crumbs'
import { ensureContainerView, wireViewAdopted } from './Detail/Views/viewMint'
import { normalizePropertyName, wrapKey } from '@shared/governedKeys'

interface RenameClaim {
  token: number
  path: string
  host: RenameHost
}
/** The path being renamed and the host the gesture declared, if it knew one. */
interface RenameFence {
  renamingPath: string | null
  renamingHost: RenameHost | null
}

// The owner fence's resolver: claims for the live path only; a gesture-declared host wins,
// then rank, then first-come — insertion order breaks ties at every step.
let nextRenameToken = 1
// The unclaimed-session sweep's beat — long enough for a create's row to arrive and claim.
const RENAME_CLAIM_BEAT_MS = 2000
let renameOrphanTimer: number | undefined
const RENAME_RANK: Record<RenameHost, number> = { detail: 2, sidebar: 1 }
const RENAME_CLEARED = {
  renamingPath: null,
  renamingCreate: false,
  renamingHost: null,
  renameWinner: null,
} satisfies Partial<SessionState>
function resolveRenameWinner(claims: RenameClaim[], fence: RenameFence): number | null {
  const live = claims.filter((c) => c.path === fence.renamingPath)
  if (live.length === 0) return null
  const declared = live.find((c) => c.host === fence.renamingHost)
  if (declared) return declared.token
  let winner = live[0]
  for (const c of live) if (RENAME_RANK[c.host] > RENAME_RANK[winner.host]) winner = c
  return winner.token
}

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

/** The open page's CURRENT text. `pageDetail.body` is the load snapshot — autosave never updates it —
 *  so the live editing buffer wins whenever it belongs to this same page. Every steady-state reader of
 *  the open body goes through here; the outgoing-tab capture keys on `selection.path` instead, because
 *  it deliberately runs while `pageDetail` is still the leaving page's. */
export function openPageBody(
  pageDetail: { path: string; body: string } | null,
  liveBody: { path: string; body: string } | null,
): string {
  if (!pageDetail) return ''
  return liveBody?.path === pageDetail.path ? liveBody.body : pageDetail.body
}

/** Page paths are POSIX, so a page's container is its path minus the last segment. */
const parentPathOf = (path: string): string => path.split('/').slice(0, -1).join('/')

/** Depth-first over collections and their nested sets — callers name the container they want by
 *  whichever key they hold (id from a selection, path from a page's parent). */
function findContainer(
  tree: NexusTree,
  match: (node: CollectionNode | SetNode) => boolean,
): CollectionNode | SetNode | null {
  const inSets = (sets: SetNode[] | undefined): SetNode | null => {
    for (const s of sets ?? []) {
      if (match(s)) return s
      const deep = inSets(s.sets)
      if (deep) return deep
    }
    return null
  }
  for (const c of tree.collections ?? []) {
    if (match(c)) return c
    const hit = inSets(c.sets)
    if (hit) return hit
  }
  return null
}

type PageStatus = 'idle' | 'loading' | 'ready' | 'error'

interface SessionState {
  status: 'idle' | 'loading' | 'ready' | 'error' | 'empty'
  tree: NexusTree | null
  error?: PommoraError
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
  /** Machine-local, not the Nexus's — loaded alongside it, saved to nexus.db. */
  devicePrefs: DevicePrefs
  setDevicePref: <K extends keyof DevicePrefs>(key: K, value: DevicePrefs[K]) => void
  linkTitles: Record<string, string>
  resolveLinkTitle: (url: string) => void
  activeViews: Record<string, string>
  setActiveView: (containerId: string, viewId: string) => Promise<void>
  /** The aliases each page has been given, keyed PageID so they survive a rename. Its own slice
   *  rather than a tree-keyed derivation: authoring one and forgetting one both push no tree, and
   *  the watcher suppresses the app's own writes, so a tree-keyed cache would go on offering an
   *  alias that had just been forgotten. */
  pageAliases: Record<string, string[]>
  rememberAlias: (pageId: string, alias: string) => void
  forgetAlias: (pageId: string, alias: string) => void
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
  pageError?: PommoraError
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
  navOpen: boolean
  openNav: () => void
  closeNav: () => void
  toggleNav: () => void

  settingsOpen: boolean
  openSettings: () => void
  closeSettings: () => void
  toggleSettings: () => void

  /** The in-app browser's current address; null = closed. A summon while open retakes the
   *  window in place — the singleton the page preview also is. */
  browserUrl: string | null
  openBrowser: (url: string) => void
  closeBrowser: () => void

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
  createFromMenu: (items: Creator[], host?: RenameHost) => Promise<void>

  renamingPath: string | null
  /** The open rename is a just-created entity's naming session — the field opens empty and a
   *  page's first commit rides the create (disambiguating, cascade-free). */
  renamingCreate: boolean
  /** The gesture-declared field host, when the caller knew its surface; null resolves by rank. */
  renamingHost: RenameHost | null
  /** The owner fence: field hosts claim on mount; one claim wins (declared host first, then
   *  rank — detail over sidebar — then first-come) and only the winner mounts an input. */
  renameClaims: RenameClaim[]
  renameWinner: number | null
  claimRename: (path: string, host: RenameHost) => number | null
  releaseRename: (token: number) => void
  beginRename: (path: string, create?: boolean, host?: RenameHost) => void
  cancelRename: () => void
  submitRename: (path: string, kind: MutableKind, newName: string) => Promise<boolean>
  /** The page whose icon picker is open, from a menu's Change Icon. One consumer — the sidebar row
   *  — so it needs no owner fence: the row at this path opens the picker and clears it on dismiss. */
  iconPath: string | null
  beginIcon: (path: string) => void
  endIcon: () => void
  /** The sidebar's New Page Above/Below — position computed here, where the sibling order lives.
   *  `host` carries the gesture's surface into the naming fence. */
  newPageAdjacent: (path: string, where: 'above' | 'below', host?: RenameHost) => Promise<void>

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
// Read once per NEXUS, not per reconcile: applyTree runs on every tree change and must never carry
// a round trip, but nexus.db travels inside the Nexus — so opening a different one reads again.
let devicePrefsLoaded = false

export const useSession = create<SessionState>((set, get) => {
  // One writer for both alias gestures. The slice mirrors exactly what a reload gives back, so a
  // page left with nothing loses its key rather than holding an empty list — the same rule the
  // scope's own write applies on disk.
  const putAliases = (pageId: string, next: string[]): void => {
    set((s) => {
      const map = { ...s.pageAliases }
      if (next.length) map[pageId] = next
      else delete map[pageId]
      return { pageAliases: map }
    })
    void window.nexus.aliases.set(pageId, next)
  }

  // Clearing activeTabId marks the tab set never-seeded, so load() re-reads the new nexus's sidecars.
  const resetNexusSession = (): void => {
    pageFetchSeq++
    devicePrefsLoaded = false
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
      pinned: [],
      pinnedTabs: [],
      favorites: [],
      recents: [],
      navBanner: undefined,
      // Defaults here so a nexus without the setting can't inherit the previous one's.
      subfieldExpanded: true,
      subfieldOrder: {},
      navWindowMode: 'list',
      navViewMode: 'list',
      // The per-nexus maps keyed by ids the next nexus doesn't share. The adopt path reaches here
      // without a following load(), so anything left behind is written back under foreign keys.
      pageAliases: {},
      activeViews: {},
      linkTitles: {},
    })
    clearWarm()
    clearPreviewWarm()
  }

  const openVia = async (attempt: () => Promise<Result<boolean>>): Promise<void> => {
    try {
      // Close before the root can flip, even if the adopt is then canceled — data safety
      // beats window persistence.
      set({ navOpen: false, preview: null, previewTarget: null })
      // Flush every pending page-body write to the CURRENT nexus before an adopt flips the root —
      // else a debounce timer or an embed's exit flush landing after the flip binds the NEW nexus
      // and overwrites a same-relative-path file there. Awaited so main binds the old root.
      await flushAllPageSaves()
      const opened = await attempt()
      if (!opened.ok) {
        set({ status: 'error', error: opened.error })
        return
      }
      if (opened.value) {
        resetNexusSession()
        await get().load()
      }
    } catch (e) {
      set({ status: 'error', error: caught(e) })
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

  // The gallery sentinel never persists — openNavPreview re-seeds it as tab 1 on every open, so
  // only the page tabs write, and activeIndex counts by the stored (page-only) order.
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
    set({ preview: next, previewTarget: deriveTarget(next), ...extra })
    const retire =
      prev && prev.flavor === 'page' && prev.originId !== next?.originId ? prev.originId : undefined
    mirrorPreviews(retire)
  }

  const findActiveTab = (): Tab | undefined => {
    const s = get()
    return (
      s.tabs.find((t) => t.id === s.activeTabId) ?? s.pinnedTabs.find((t) => t.id === s.activeTabId)
    )
  }

  const syncActiveDetail = (): void => {
    // A tab-focus change (activate, new tab, a close refocusing) is not navigation — the breadcrumb
    // tail belongs to the tab you were walking, so it resets rather than leaking onto the new one.
    // In-tab moves and the breadcrumb-click dedup switch load detail through `select` directly, never
    // here, so their held depth is untouched.
    set({ crumbDepth: null })
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

  // The pin gestures' writer — one of pinnedTabs' four (load, tree push, nav push, here).
  const commitPinned = (pinned: NavRef[]): void => {
    const tree = get().tree
    set({ pinned, pinnedTabs: derivePinnedTabs(pinned, tree ? reconcileIndexOf(tree) : null) })
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

  // Move the active tab's history pointer to an absolute stack index, showing what sits there without
  // re-recording — the one mover behind Back/Forward and breadcrumb re-navigation alike.
  const jumpActiveHistory = (i: number): void => {
    const s = get()
    const active = activeUnpinnedTab(s.tabs, s.activeTabId)
    if (!active || active.target.kind === 'newtab') return
    if (i < 0 || i >= active.navStack.length || i === active.navIndex) return
    const resolved = s.tree ? reconcileSelection(s.tree, active.navStack[i]) : active.navStack[i]
    if (resolved.kind === 'none') return
    captureOutgoingDetail()
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
            // Independent fetches, one round of latency. The raw database reads keep a catch and
            // name what the surface falls back to; the envelope channels structurally cannot reject.
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
              window.nexus.aliases
                .get()
                .then((aliases) => set({ pageAliases: aliases }))
                .catch(() => undefined), // the picker offers titles only
            ])
            // A mutation refetch must NOT re-read the sidecar here — its debounced write trails
            // the in-memory tab set, so a re-read would roll the tabs backward.
            if (get().activeTabId === '') {
              // Disk leads exactly here (the first load) and on the external-edit push —
              // navigation is never re-read mid-session, so a just-made change can't roll back.
              const read = await window.nexus.nav.read().catch(() => null)
              const nav = read?.ok ? read.value : null
              const pinned = nav?.pinned ?? []
              const restoreTree = get().tree
              const restoreIndex = restoreTree ? reconcileIndexOf(restoreTree) : null
              set({
                pinned,
                pinnedTabs: derivePinnedTabs(pinned, restoreIndex),
                favorites: nav?.favorites ?? [],
                recents: nav?.recents ?? [],
                navBanner: nav?.banner,
              })
              get().evictThumbs()
              const previews = await window.nexus.previews?.load().catch(() => null)
              if (previews?.ok) set({ previewsFile: previews.value })
              const stored = await window.nexus.tabs.load().catch(() => null)
              const storedSet = stored?.ok ? stored.value : null
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
        set({ status: 'error', error: caught(e) })
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
      const index = reconcileIndexOf(tree)
      // Tree push = pinned hydration writer #2: renames re-title, moves re-path, deletes drop.
      // Identity-preserving, like stabilize(): an echo push keeps the same array, so memos hold.
      const nextPinnedTabs = derivePinnedTabs(get().pinned, index)
      if (!sameTabs(get().pinnedTabs, nextPinnedTabs)) set({ pinnedTabs: nextPinnedTabs })
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
        // reconcileTabs only re-points when an UNPINNED tab changed — a deleted pinned entity
        // with nothing else open leaves the pointer dangling, so the keeper always runs.
        ensureLiveActive()
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
      // Read from the module cache, not an awaited IPC call — applyTree runs on every push,
      // and a round-trip here would gate the whole reconcile behind it. Each pass refreshes
      // the cache fire-and-forget, so the NEXT push sees a system-accent change.
      if (systemAccentCache === undefined) systemAccentCache = await window.nexus.systemAccent()
      else
        void window.nexus.systemAccent().then((c) => {
          systemAccentCache = c
        })
      const systemColor = systemAccentCache
      applyAccent(tree.accent, systemColor)
      applySystemAccent(systemColor)
      set({ personalization: tree.personalization, commands: tree.commands })
      applyPersonalization(tree.personalization)
      if (!devicePrefsLoaded) {
        devicePrefsLoaded = true
        const prefs = await window.nexus.devicePrefs.load()
        if (prefs.ok) set({ devicePrefs: prefs.value ?? {} })
      }
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
    devicePrefs: {},
    setDevicePref: (key, value) => {
      set((s) => ({ devicePrefs: { ...s.devicePrefs, [key]: value } }))
      void window.nexus.devicePrefs.save(get().devicePrefs)
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

    linkTitles: {},
    resolveLinkTitle: (url) => {
      if (inFlightTitles.has(url) || failedTitles.has(url) || get().linkTitles[url]) return
      inFlightTitles.add(url)
      window.nexus.linkTitles
        .fetch(url)
        .then((res) => {
          // A late fetch resolving after a nexus switch merges into the new map harmlessly: a URL's
          // <title> is identical in any nexus, and main won't persist it cross-nexus (cacheRoot === root).
          const title = res.ok ? res.value.title : null
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

    pageAliases: {},
    rememberAlias: (pageId, alias) => {
      const words = alias.trim()
      if (!words) return
      const worn = get().pageAliases[pageId] ?? []
      // Most recently given first, and never twice: giving a page an alias it already wears
      // promotes that one rather than adding a second copy of it.
      if (worn[0] === words) return
      putAliases(pageId, [words, ...worn.filter((a) => a !== words)])
    },
    forgetAlias: (pageId, alias) => {
      const worn = get().pageAliases[pageId]
      if (!worn?.includes(alias)) return
      putAliases(
        pageId,
        worn.filter((a) => a !== alias),
      )
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
    crumbDepth: null,
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
      const pinned = nav.pinned ?? []
      const tree = get().tree
      set({
        pinned,
        pinnedTabs: derivePinnedTabs(pinned, tree ? reconcileIndexOf(tree) : null),
        favorites: nav.favorites ?? [],
        navBanner: nav.banner,
      })
      graduatePinCovered()
      ensureLiveActive()
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
    navOpen: false,
    openNav: () => {
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
    toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),

    browserUrl: null,
    openBrowser: (url) => set({ browserUrl: url }),
    closeBrowser: () => set({ browserUrl: null }),
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
      // The breadcrumb's deepest node follows every navigation — held while walking up its spine, so
      // the tail stays dimmed; reset on a branch. Runs for record:false too (Back/Forward, breadcrumb).
      {
        const depth = crumbDepthFor(get().tree, get().crumbDepth, target)
        if (depth !== get().crumbDepth) set({ crumbDepth: depth })
      }
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
          if (col) ensureContainerView(col, col.properties ?? [])
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
            res = fail('operation-failed', errText(e))
          }
          clearTimeout(fallback)
          if (seq !== pageFetchSeq) return
          if (res.ok) {
            set({
              selection: pageSel,
              pageStatus: 'ready',
              pageDetail: res.value,
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
      if (res?.ok) set({ pageDetail: res.value })
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

    iconPath: null,
    beginIcon: (path) => set({ iconPath: path }),
    endIcon: () => set({ iconPath: null }),

    renamingPath: null,
    renamingCreate: false,
    renamingHost: null,
    renameClaims: [],
    renameWinner: null,
    claimRename: (path, host) => {
      if (path !== get().renamingPath) return null
      const token = nextRenameToken++
      set((s) => {
        const renameClaims = [...s.renameClaims, { token, path, host }]
        return { renameClaims, renameWinner: resolveRenameWinner(renameClaims, s) }
      })
      return token
    },
    releaseRename: (token) => {
      const { renameClaims, renameWinner } = get()
      const released = renameClaims.find((c) => c.token === token)
      const wasWinner = renameWinner === token
      // Claims minted before this release are standing twins; only one minted AFTER it can be
      // the released field itself remounting.
      const rebirthFence = nextRenameToken
      set((s) => {
        const claims = s.renameClaims.filter((c) => c.token !== token)
        return { renameClaims: claims, renameWinner: resolveRenameWinner(claims, s) }
      })
      // The verdict waits a microtask: StrictMode's simulated remount (and any same-act re-key)
      // releases and re-claims in one act — an immediate cancel would kill every dev rename.
      // A rename whose winning surface left is abandoned, never handed to a standing claimant
      // (same host or not — the same path fielded twice, say a view plus its embed): a transfer
      // would focus-steal, whole-title selected, and a create session would reopen empty. The
      // verdict judges the RELEASED claim's own path: the live session may already belong to a
      // successor (main pushes a create's begin-rename before its row exists to claim).
      queueMicrotask(() => {
        const s = get()
        if (released === undefined || s.renamingPath !== released.path) return
        const survivor = s.renameClaims.find((c) => c.token === s.renameWinner)
        if (!survivor || (wasWinner && survivor.token < rebirthFence)) s.cancelRename()
      })
    },
    beginRename: (path, create, host) => {
      set((s) => {
        const fence: RenameFence = { renamingPath: path, renamingHost: host ?? null }
        return {
          ...fence,
          renamingCreate: create === true,
          renameWinner: resolveRenameWinner(s.renameClaims, fence),
        }
      })
      // The fence self-heals when no surface ever claims — a newborn a filter hides, or a
      // navigate-away mid-create, would otherwise strand the session: every ghost suppressed
      // for the rest of it, and an unprompted empty field opening when the row later mounts.
      // The beat covers the legitimate window where main pushes a create's begin-rename before
      // its row exists to claim.
      window.clearTimeout(renameOrphanTimer)
      renameOrphanTimer = window.setTimeout(() => {
        const s = get()
        if (s.renamingPath === path && !s.renameClaims.some((c) => c.path === path))
          s.cancelRename()
      }, RENAME_CLAIM_BEAT_MS)
    },
    cancelRename: () => set(RENAME_CLEARED),
    newPageAdjacent: async (path, where, host) => {
      const tree = get().tree
      if (!tree) return
      const parentPath = parentPathOf(path)
      const container = findContainer(tree, (n) => n.path === parentPath)
      if (!container) return
      const anchor = container.pages.find((p) => p.path === path)
      if (!anchor) return
      const order = orderWithSlot(
        container.pages.map((p) => p.id),
        anchor.id,
        where,
      )
      await get().mutate(
        { op: 'createPage', parentPath, name: DEFAULT_NEW_NAME, order },
        (created) => get().beginRename(created.path, true, host),
      )
    },
    submitRename: async (path, kind, newName) => {
      const fromCreate = get().renamingCreate && kind === 'page'
      set(RENAME_CLEARED)
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
      return get().mutate({
        op: 'rename',
        path,
        kind,
        newName,
        ...(fromCreate ? { fromCreate: true as const } : {}),
      })
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
      // Captured BEFORE the ask: main's confirming push can rename the registry in this
      // store before the reply's continuation runs.
      const before = get().tree?.registry.find((d) => d.id === target.propertyId)?.name
      const res = await window.nexus.schema.rename(
        target.collectionPath,
        target.propertyId,
        newName,
      )
      if (!res.ok) {
        await window.nexus.showError(res.error.message)
        return false
      }
      const after = normalizePropertyName(newName)
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
      // Instant optimistic patch; main's confirming push lands a beat later with no flicker
      // (stabilize() makes a matching push a no-op).
      const cur = get().tree
      let patched: NexusTree | null = null
      if (cur) {
        switch (req.op) {
          case 'movePage': {
            const moved = relocateNodeInTree(cur, req.path, req.newParentPath)
            patched = req.order
              ? (reorderPagesInTree(moved ?? cur, req.newParentPath, req.order) ?? moved)
              : moved
            break
          }
          case 'moveSet': {
            // A same-parent moveSet is a pure reorder — relocate no-ops, so the order patch is
            // what keeps the drop from snapping back until the confirm walk lands.
            const moved = relocateNodeInTree(cur, req.path, req.newParentPath)
            patched = reorderChildrenInTree(moved ?? cur, req.newParentPath, req.order) ?? moved
            break
          }
          case 'rename':
            // The landed name, never the ask — a from-create rename may have disambiguated.
            patched = renameNodeInTree(cur, req.path, res.value.renamed?.name ?? req.newName)
            // The cascade rewrites bodies NEXUS-WIDE — every warm copy is suspect, and the
            // tab-keyed editorState has no path fence (its key survives the rename): a warm
            // restore would revive the pre-cascade body and the next keystroke would write it
            // back over the heal. Warmth is an accelerator; a rename trades it for correctness.
            clearWarm()
            if (get().pageDetail) void get().reloadPage()
            break
          case 'delete':
            patched = removeNodeInTree(cur, req.path)
            dropPageDetail(req.path)
            break
          case 'reorderChildren':
            patched = reorderChildrenInTree(cur, req.parentPath, req.order)
            break
          case 'reorderTop':
            patched = reorderTopInTree(cur, req.key, req.order)
            break
          case 'setIcon': {
            patched = patchNodeInTree(cur, req.path, { icon: req.icon })
            // The page's detail is a separate copy of the same fact — patch the open one and drop
            // any warm one, or the header re-reads the pre-write value until the page refetches.
            if (req.kind === 'page') {
              dropWarmDetail(req.path)
              const detail = get().pageDetail
              if (detail && detail.path === req.path) {
                const frontmatter = { ...detail.frontmatter }
                if (req.icon === null) delete frontmatter.icon
                else frontmatter.icon = req.icon
                set({ pageDetail: { ...detail, frontmatter } })
              }
            }
            break
          }
          case 'setBanner':
            // The open page reloads itself post-write; the warm copies of `cover` don't.
            if (req.kind === 'page') dropWarmDetail(req.path)
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
      if (cur && res.value.created && onCreated) {
        const optimistic = insertCreatedInTree(cur, req, res.value.created)
        if (optimistic) {
          // The callback's sync body runs BEFORE the tree applies, so its state — order
          // splices, naming state, a held ghost seat — lands in the SAME commit that mounts
          // the newborn. Applied first, the newborn paints one frame unseated (ranked last,
          // no naming field) and then teleports into place.
          const settled = onCreated(res.value.created)
          await get().applyTree(optimistic)
          await settled
          createdShown = true
        }
      }
      if (!createdShown && res.value.created && onCreated) await onCreated(res.value.created)
      return true
    },
  }
})

// A sentinel view adoption happens inside store-free viewMint; the pointer it persisted lands
// in the slice here, or the slice serves a stale fallback until the next reload.
wireViewAdopted((containerId, viewId) =>
  useSession.setState((s) => ({ activeViews: { ...s.activeViews, [containerId]: viewId } })),
)
