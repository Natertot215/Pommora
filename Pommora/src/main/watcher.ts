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
import { HOMEPAGE_HOST_DIRNAME, NEXUS_CONFIG_FILES } from './paths'
import { push as pushToWindow } from './ipc'
import { seedContentIndex } from './indexSeed'
import { getLiveTree, refreshAfterWrite } from './liveTree'
import { sessionRoot } from './session'
import { readWatchScope } from './settings'
import { applyWatchEvents, touchesCorpus, type WatchEvent, type WatchEventName } from './watchPatch'
import { CONTEXTS_DIRNAME, NEXUS_DIR } from '@shared/nexusPaths'

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

// Ignore only what ISN'T user-meaningful tree content: the SQLite databases (which thrash via
// WAL on every operational write), the .trash, and OS/editor dotfile cruft.
// Crucially we DO watch .nexus/ — Contexts (.nexus/contexts/) and settings/state (accent,
// labels, ordering) live there, so external edits to them must auto-refresh. Checks only
// the path BELOW the root, so a dot-segment in the root's own absolute path (e.g. a nexus
// under ~/.something) can't blank the whole watch.
export function ignoredUnder(root: string, scope: WatchScope): (path: string) => boolean {
  // User-excluded folders never reach the tree, so their churn must not cost a reconcile
  // (un-excluding a folder mid-session takes effect on the next nexus open / watcher restart).
  const isExcluded = excludedMatcher(scope.excluded)
  const isAsset = assetMatcher(scope.assetDir)
  const assetDepth = rootSegs(scope.assetDir).length
  return (path) => {
    const rel = relative(root, path)
    if (!rel || rel.startsWith('..')) return false
    const segs = rel.split(sep)
    // The asset root's OWN segments are exempt from the rules below — the dot-prefix one would
    // blind a root named `.attachments`, and an exclusion entry would blind any of them. What
    // sits below the root is ordinary cruft and still filtered: a synced folder's `.DS_Store`
    // is not an asset.
    if (isAsset(segs)) return segs.slice(assetDepth).some(neverWatched)
    return (
      segs.some(neverWatched) ||
      // Block-host content loads through blocks:get, never the tree walk —
      // a debounced block-body write must not cost a full re-walk. The
      // homepage.json config FILE stays watched (the tree reads its banner).
      (segs[0] === NEXUS_DIR && segs[1] === HOMEPAGE_HOST_DIRNAME) ||
      // Space hosts get the same treatment file-granularly: a tile `.md` inside
      // `.nexus/contexts/<C>/<S>/` never walks, while `_space.json` (banner/color/tags
      // the tree reads) stays watched.
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
    ignoreInitial: true, // existing files aren't "changes"
    persistent: true,
    awaitWriteFinish: { stabilityThreshold: SETTLE_MS, pollInterval: 50 },
    atomic: true, // coalesce the mv-_tmp atomic writes our writers use
  })
  const onEvent =
    (event: WatchEventName) =>
    (path: string): void => {
      // Navigation events skip the echo suppression BELOW it — the window exists to spare
      // wasted tree work, and a nav event never touches the tree. A hand-edit landing right
      // after the app's own write is therefore never swallowed; a self-write's echo is one
      // debounced re-read of a small file whose content the renderer already holds.
      if (isNavPath(root, path)) {
        if (navDebounce) clearTimeout(navDebounce)
        navDebounce = setTimeout(() => void pushNav(root, win), SETTLE_MS)
        return
      }
      // The app's own atomic writes echo back here — skip them: every tree-relevant
      // in-app write confirms through its own channel, so the echo only buys wasted
      // work (hot under block gestures + embed typing). External edits still land.
      if (isRecentWrite(path)) return
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
    // An unhandled 'error' on an EventEmitter is RE-THROWN → it would crash the main
    // process (EMFILE/ENOSPC from fd/inotify-watch exhaustion, EPERM, a watched dir
    // vanishing). Log + no-op; the tree stays as last-read and ⌘R Reload recovers.
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

/** Spend the settle window's batch: patch what classifies, walk for the rest — through the
 *  seam either way, so what the renderer receives is exactly what main now holds. Push only
 *  when the tree object moved (an all-index-only batch changes nothing anyone renders). */
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
    // One push for the whole batch, however many files the sync delivered. Nothing held before
    // means nothing has asked for the map yet — the first ask serves it fresh.
    const assets = getHeldAssetMap(root)
    if (assetsBefore && assets && assets !== assetsBefore)
      pushToWindow(win, 'assets:changed', assets)
    if (outcome !== 'refresh') return
    // A refresh means the corpus may have moved in ways no arm named — the stat-gated seed
    // reconciles the index for the same cost as the walk's own stats. Only a batch that could
    // have moved the corpus owes it: a walk forced by a registry edit leaves the index exact.
    if (touchesCorpus(root, events, scope)) await seedContentIndex(root)
    if (sessionRoot() !== root || win.isDestroyed()) return
    // The scope this watcher was armed with is spent state: an edit to either half classifies
    // `refresh` above, but the classifier and chokidar's own ignore filter would keep reading
    // the stale capture — and a note under a newly-excluded folder would ride `index-only` back
    // into the queryable rows. A changed scope moves the corpus by definition, so the rows it
    // now disowns are reconciled before the fresh watcher arms.
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
