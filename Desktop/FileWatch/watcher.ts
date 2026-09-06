// Live filesystem watcher: events accumulate through a debounced settle, then classify to
// targeted patches against the live tree — the unclassifiable fall back to one verification
// walk. The path is spent, not discarded. ⌘R Reload stays as the manual fallback.

import chokidar, { type FSWatcher } from 'chokidar'
import type { BrowserWindow } from 'electron'
import { sameScope, type WatchScope } from '@pommora/core/Locations/exclusion'
import {
  ignoredUnder,
  isNavPath,
  tilesChangedIn,
  valueChangesOf,
} from '@pommora/core/Nexus/watchSettle'
import { getHeldAssetMap, refreshAssetMap } from '@pommora/core/Assets/assetMap'
import { readNavigationFile } from '@pommora/core/Navigation/navigationFile'
import { isRecentWrite } from '@pommora/core/IO/writeEcho'
import { push as pushToWindow } from '../Bridge/ipc'
import { seedContentIndex } from '@pommora/core/Index/indexSeed'
import { getLiveTree, refreshAfterWrite } from '@pommora/core/Nexus/liveTree'
import { sessionRoot } from '@pommora/core/Nexus/session'
import { readWatchScope } from '@pommora/core/Settings/settings'
import {
  applyWatchEvents,
  touchesCorpus,
  type WatchEvent,
  type WatchEventName,
} from '@pommora/core/Nexus/watchPatch'

const SETTLE_MS = 200

let watcher: FSWatcher | null = null
let debounce: ReturnType<typeof setTimeout> | null = null
let navDebounce: ReturnType<typeof setTimeout> | null = null
let batch: WatchEvent[] = []

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
      // The app's own atomic writes echo back here; every in-app write confirms through its own channel.
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
