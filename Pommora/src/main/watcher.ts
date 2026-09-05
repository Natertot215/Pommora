// Live filesystem watcher: events accumulate through a debounced settle, then classify to
// targeted patches against the live tree — the unclassifiable fall back to one verification
// walk. The path is spent, not discarded. ⌘R Reload stays as the manual fallback.

import { relative, sep } from 'node:path'
import chokidar, { type FSWatcher } from 'chokidar'
import type { BrowserWindow } from 'electron'
import {
  assetMatcher,
  excludedMatcher,
  neverWatched,
  rootSegs,
  sameScope,
  type WatchScope,
} from './exclusion'
import { getHeldAssetMap, refreshAssetMap } from './assetMap'
import { readNavigationFile } from './IO/navigationFile'
import { isRecentWrite } from './IO/writeEcho'
import { isMarkdownFile } from './IO/walk'
import { HOMEPAGE_HOST_DIRNAME, NEXUS_CONFIG_FILES, TILE_DOC_FILENAME } from './paths'
import { push as pushToWindow } from './ipc'
import { seedContentIndex } from './indexSeed'
import { getLiveTree, refreshAfterWrite } from './liveTree'
import { sessionRoot } from './session'
import { readWatchScope } from './settings'
import {
  applyWatchEvents,
  classifyEvent,
  touchesCorpus,
  type WatchEvent,
  type WatchEventName,
} from './watchPatch'
import { containerOf, pageIdIndex } from './valuesChanged'
import { CONTEXTS_DIRNAME, NEXUS_DIR } from '@shared/nexusPaths'
import type { NexusTree, ValueChange } from '@shared/types'
import { type TileHostRef, tileHostKey } from '@shared/tiles'

const SETTLE_MS = 200

let watcher: FSWatcher | null = null
let debounce: ReturnType<typeof setTimeout> | null = null
let navDebounce: ReturnType<typeof setTimeout> | null = null
let batch: WatchEvent[] = []

/** The navigation file — its changes push nav state only, never a tree re-walk (nav data isn't
 *  in the tree). */
export function isNavPath(root: string, path: string): boolean {
  const segs = relative(root, path).split(sep)
  return segs[0] === NEXUS_DIR && segs[1] === NEXUS_CONFIG_FILES.navigation
}

// We DO watch .nexus/ — Contexts and settings/state live there, so external edits to them
// must auto-refresh. Checks only the path BELOW the root, so a dot-segment in the root's own
// absolute path (e.g. a nexus under ~/.something) can't blank the whole watch.
export function ignoredUnder(root: string, scope: WatchScope): (path: string) => boolean {
  // User-excluded folders never reach the tree, so their churn must not cost a reconcile.
  const isExcluded = excludedMatcher(scope.excluded)
  const isAsset = assetMatcher(scope.assetDir)
  const assetDepth = rootSegs(scope.assetDir).length
  return (path) => {
    const rel = relative(root, path)
    if (!rel || rel.startsWith('..')) return false
    const segs = rel.split(sep)
    // The asset root's OWN segments are exempt from the rules below — the dot-prefix one would
    // blind a root named `.attachments`, and an exclusion entry would blind any of them. What
    // sits below the root is ordinary cruft and still filtered.
    if (isAsset(segs)) return segs.slice(assetDepth).some(neverWatched)
    return (
      segs.some(neverWatched) ||
      // Tile bodies load through tiles:get, never the tree walk — a debounced body write must not
      // cost a re-walk. The host's document stays watched, and so does the folder entry itself,
      // since chokidar never descends into an ignored directory.
      (segs[0] === NEXUS_DIR &&
        segs[1] === HOMEPAGE_HOST_DIRNAME &&
        segs.length >= 3 &&
        segs[2] !== TILE_DOC_FILENAME) ||
      // Space hosts get the same treatment file-granularly: a tile `.md` inside a Space
      // never walks, while `_space.json` (the tree reads banner/color/tags) stays watched.
      (segs[0] === NEXUS_DIR &&
        segs[1] === CONTEXTS_DIRNAME &&
        segs.length >= 5 &&
        isMarkdownFile(segs[segs.length - 1])) ||
      isExcluded(segs)
    )
  }
}

/** Start (or restart) watching `root`, pushing fresh trees to `win`. */
export async function startWatcher(root: string, win: BrowserWindow): Promise<void> {
  stopWatcher()
  const scope = await readWatchScope(root)
  if (sessionRoot() !== root) return // session switched during the settings read
  watcher = chokidar.watch(root, {
    ignored: ignoredUnder(root, scope),
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: { stabilityThreshold: SETTLE_MS, pollInterval: 50 },
    atomic: true, // coalesce the mv-_tmp atomic writes our writers use
  })
  const onEvent =
    (event: WatchEventName) =>
    (path: string): void => {
      // Navigation events skip the echo suppression BELOW it — a nav event never touches the
      // tree, so a hand-edit landing right after the app's own write is never swallowed.
      if (isNavPath(root, path)) {
        if (navDebounce) clearTimeout(navDebounce)
        navDebounce = setTimeout(() => void pushNav(root, win), SETTLE_MS)
        return
      }
      // The app's own atomic writes echo back here — skip them: every tree-relevant in-app
      // write confirms through its own channel (hot under tile gestures + embed typing). A host
      // document is exempt like navigation: a synced or hand edit landing right after the app's
      // own save must reach the open host, and the host's re-read returns what it just wrote.
      if (!path.endsWith(`${sep}${TILE_DOC_FILENAME}`) && isRecentWrite(path)) return
      batch.push({ event, absPath: path })
      if (debounce) clearTimeout(debounce)
      debounce = setTimeout(() => void settle(root, win, scope), SETTLE_MS)
    }
  watcher
    .on('add', onEvent('add'))
    .on('change', onEvent('change'))
    .on('unlink', onEvent('unlink'))
    .on('addDir', onEvent('addDir'))
    .on('unlinkDir', onEvent('unlinkDir'))
    // An unhandled 'error' on an EventEmitter is RE-THROWN → it would crash the main process
    // (EMFILE/ENOSPC, EPERM, a watched dir vanishing). Log + no-op; ⌘R Reload recovers.
    .on('error', (error: unknown) => console.error('Nexus watcher error (non-fatal):', error))
}

/** Stop watching + cancel any pending push. Safe to call when not watching. */
export function stopWatcher(): void {
  if (debounce) {
    clearTimeout(debounce)
    debounce = null
  }
  if (navDebounce) {
    clearTimeout(navDebounce)
    navDebounce = null
  }
  if (watcher) {
    void watcher.close()
    watcher = null
  }
  batch = []
}

/** The containers whose page values a batch touched, with the ids the tree resolves; a batch that
 *  degraded to a walk names its containers with no ids, so the renderer retires only settled
 *  overrides. */
function valueChangesOf(
  events: WatchEvent[],
  root: string,
  scope: WatchScope,
  tree: NexusTree | null,
): ValueChange[] {
  const held = getLiveTree()
  if (!held) return []
  const byPath = pageIdIndex(tree)
  const byContainer = new Map<string, Set<string>>()
  for (const ev of events) {
    const c = classifyEvent(held, root, ev, scope)
    if (c.kind !== 'page-upsert') continue
    const container = containerOf(c.rel)
    const ids = byContainer.get(container) ?? new Set<string>()
    byContainer.set(container, ids)
    const id = byPath.get(c.rel)
    if (id) ids.add(id)
  }
  return [...byContainer].map(([rel, ids]) => ({ rel, pageIds: [...ids] }))
}

/** The hosts whose document a batch touched, each once — read off the raw batch, since a batch
 *  holding one unclassifiable event applies none of its arms. */
function tilesChangedIn(events: WatchEvent[], root: string, scope: WatchScope): TileHostRef[] {
  const held = getLiveTree()
  if (!held) return []
  const hosts = new Map<string, TileHostRef>()
  for (const ev of events) {
    const c = classifyEvent(held, root, ev, scope)
    if (c.kind === 'tiles-leaf') hosts.set(tileHostKey(c.host), c.host)
  }
  return [...hosts.values()]
}

/** Spend the settle window's batch: patch what classifies, walk for the rest. Push only when the
 *  tree object moved (an all-index-only batch changes nothing anyone renders). */
async function settle(root: string, win: BrowserWindow, scope: WatchScope): Promise<void> {
  if (sessionRoot() !== root || win.isDestroyed()) return
  const events = batch
  batch = []
  try {
    const before = getLiveTree()
    const assetsBefore = getHeldAssetMap(root)
    const outcome = await applyWatchEvents(root, events, scope)
    let tree = getLiveTree()
    // The map is patch-only, and a batch holding one unclassifiable event applies none of its
    // asset classes — the walk the watcher falls back to is where the listing is taken again.
    if (outcome === 'refresh') {
      await refreshAssetMap(root)
      tree = await refreshAfterWrite(root)
    }
    // Re-checked after the awaits: a session that switched mid-settle must not receive the
    // OLD root's walked tree (a superseded walk still returns it to its awaiters).
    if (sessionRoot() !== root || win.isDestroyed()) return
    if (tree && tree !== before) pushToWindow(win, 'nexus:changed', tree)
    const changed = valueChangesOf(events, root, scope, outcome === 'refresh' ? null : tree)
    if (changed.length) pushToWindow(win, 'values:changed', changed)
    for (const host of tilesChangedIn(events, root, scope)) pushToWindow(win, 'tiles:changed', host)
    // One push for the whole batch, however many files the sync delivered.
    const assets = getHeldAssetMap(root)
    if (assetsBefore && assets && assets !== assetsBefore)
      pushToWindow(win, 'assets:changed', assets)
    if (outcome !== 'refresh') return
    // A refresh means the corpus may have moved in ways no arm named — the stat-gated seed
    // reconciles the index for the same cost as the walk's own stats. Only a batch that could
    // have moved the corpus owes it.
    if (touchesCorpus(root, events, scope)) await seedContentIndex(root)
    if (sessionRoot() !== root || win.isDestroyed()) return
    // The scope this watcher was armed with is spent state: an edit to either half classifies
    // `refresh` above, but the classifier and chokidar's ignore filter would keep reading the
    // stale capture. A changed scope moves the corpus, so its disowned rows are reconciled
    // before the fresh watcher arms.
    if (!sameScope(await readWatchScope(root), scope)) {
      await seedContentIndex(root)
      if (sessionRoot() !== root || win.isDestroyed()) return
      void startWatcher(root, win)
    }
  } catch {
    // Transient FS state mid-write — the next settle re-reads (Reload is the fallback).
  }
}

/** Push the navigation file's keys only — no tree walk. Fires on ANY navigation.json change,
 *  the app's own included; the renderer adopts pinned/favorites/banner (recents aren't in the
 *  file), so an external or synced-in edit surfaces live. */
async function pushNav(root: string, win: BrowserWindow): Promise<void> {
  if (sessionRoot() !== root || win.isDestroyed()) return
  try {
    const nav = await readNavigationFile(root)
    pushToWindow(win, 'nav:changed', nav)
  } catch {
    // Transient FS state mid-sync — the next settle re-reads.
  }
}
