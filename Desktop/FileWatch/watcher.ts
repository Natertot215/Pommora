// Events settle, then classify to targeted patches; the unclassifiable fall back to one walk.

import chokidar, { type FSWatcher } from 'chokidar'
import type { BrowserWindow } from 'electron'
import { sameScope, type WatchScope } from '@pommora/core/Paths/exclusion'
import {
  classifyBatch,
  emitWatch,
  isConfigPath,
  pagesChangedIn,
  syncIgnoredUnder,
  tileBodyOf,
  tilesChangedIn,
  valueChangesOf,
} from '@pommora/core/Nexus/watchSettle'
import { getHeldAssetMap, refreshAssetMap } from '@pommora/core/Assets/assetMap'
import { readMatrixFile } from '@pommora/core/Matrix/matrixFile'
import { readNavigationFile } from '@pommora/core/Navigation/navigationFile'
import { isRecentWrite } from '@pommora/core/Files/writeEcho'
import { push as pushToWindow } from '../Bridge/ipc'
import { posixPath } from '../Platform/hostPath'
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
let pushedNav = ''
let matrixDebounce: ReturnType<typeof setTimeout> | null = null
let pushedMatrix = ''
let batch: WatchEvent[] = []

export async function startWatcher(root: string, win: BrowserWindow): Promise<void> {
  stopWatcher()
  const scope = await readWatchScope(root)
  if (sessionRoot() !== root) return // session switched during the settings read
  const skip = syncIgnoredUnder(root, scope)
  const isTileBody = tileBodyOf(root)
  watcher = chokidar.watch(root, {
    ignored: (path: string) => skip(posixPath(path)),
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: { stabilityThreshold: SETTLE_MS, pollInterval: 50 },
  })
  const onEvent =
    (event: WatchEventName) =>
    (hostPath: string): void => {
      const path = posixPath(hostPath)
      emitWatch(event, path)
      if (isTileBody(path)) return
      // The app's own writes echo back and confirm through their own channels; state.json skips that suppression because both its lanes settle to no push when nothing moved, so a hand-edit landing right after the app's own write is not swallowed.
      if (isConfigPath(root, path, 'state')) {
        if (navDebounce) clearTimeout(navDebounce)
        navDebounce = setTimeout(() => void pushNav(root, win), SETTLE_MS)
      } else if (isConfigPath(root, path, 'matrix')) {
        if (matrixDebounce) clearTimeout(matrixDebounce)
        matrixDebounce = setTimeout(() => void pushMatrix(root, win), SETTLE_MS)
      } else if (isRecentWrite(path)) return
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
    // An unhandled 'error' on an EventEmitter is RE-THROWN → it would crash the main process (EMFILE/ENOSPC, EPERM, a watched dir vanishing). Log + no-op; ⌘R Reload recovers.
    .on('error', (error: unknown) => console.error('Nexus watcher error (non-fatal):', error))
}

export function stopWatcher(): void {
  if (debounce) {
    clearTimeout(debounce)
    debounce = null
  }
  if (navDebounce) {
    clearTimeout(navDebounce)
    navDebounce = null
  }
  pushedNav = ''
  if (matrixDebounce) {
    clearTimeout(matrixDebounce)
    matrixDebounce = null
  }
  pushedMatrix = ''
  if (watcher) {
    void watcher.close()
    watcher = null
  }
  batch = []
}

/** Patch what classifies, walk for the rest. Pushes only when the tree object moved — an index-only batch changes nothing anyone renders. */
async function settle(root: string, win: BrowserWindow, scope: WatchScope): Promise<void> {
  if (sessionRoot() !== root || win.isDestroyed()) return
  const events = batch
  batch = []
  try {
    const before = getLiveTree()
    const assetsBefore = getHeldAssetMap(root)
    const outcome = await applyWatchEvents(root, events, scope)
    let tree = getLiveTree()
    // The map is patch-only, so the fallback walk is where the listing is taken again.
    if (outcome === 'refresh') {
      await refreshAssetMap(root)
      tree = await refreshAfterWrite(root)
    }
    // A session that switched mid-settle must not receive the OLD root's walked tree — a superseded walk still returns it to its awaiters.
    if (sessionRoot() !== root || win.isDestroyed()) return
    if (tree && tree !== before) pushToWindow(win, 'nexus:changed', tree)
    const classified = classifyBatch(events, root, scope)
    const pages = pagesChangedIn(classified)
    if (pages.length) pushToWindow(win, 'pages:changed', pages)
    const changed = valueChangesOf(classified, outcome === 'refresh' ? null : tree)
    if (changed.length) pushToWindow(win, 'values:changed', changed)
    for (const host of tilesChangedIn(classified)) pushToWindow(win, 'tiles:changed', host)
    const assets = getHeldAssetMap(root)
    if (assetsBefore && assets && assets !== assetsBefore)
      pushToWindow(win, 'assets:changed', assets)
    if (outcome !== 'refresh') return
    // The corpus may have moved in ways no arm named; the stat-gated seed costs the walk's stats.
    if (touchesCorpus(root, events, scope)) await seedContentIndex(root)
    if (sessionRoot() !== root || win.isDestroyed()) return
    // The armed scope is spent state: the classifier and chokidar's ignore filter would keep reading the stale capture, and a changed scope moves the corpus, so its disowned rows are reconciled before the fresh watcher arms.
    if (!sameScope(await readWatchScope(root), scope)) {
      await seedContentIndex(root)
      if (sessionRoot() !== root || win.isDestroyed()) return
      void startWatcher(root, win)
    }
  } catch {
    // Transient FS state mid-write — the next settle re-reads (Reload is the fallback).
  }
}

/** Pushes state.json's navigation section whenever it moves, the app's own writes included, so an external or synced-in edit surfaces live. */
async function pushNav(root: string, win: BrowserWindow): Promise<void> {
  if (sessionRoot() !== root || win.isDestroyed()) return
  try {
    const nav = await readNavigationFile(root)
    const text = JSON.stringify(nav)
    if (text === pushedNav) return
    pushedNav = text
    pushToWindow(win, 'nav:changed', nav)
  } catch {
    // Transient FS state mid-sync — the next settle re-reads.
  }
}

async function pushMatrix(root: string, win: BrowserWindow): Promise<void> {
  if (sessionRoot() !== root || win.isDestroyed()) return
  try {
    const config = await readMatrixFile(root)
    const text = JSON.stringify(config)
    if (text === pushedMatrix) return
    pushedMatrix = text
    pushToWindow(win, 'matrix:changed', config)
  } catch {
    // Transient FS state mid-sync — the next settle re-reads.
  }
}
