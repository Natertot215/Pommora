// Events settle, then classify to targeted patches; the unclassifiable fall back to one walk.

import chokidar, { type FSWatcher } from 'chokidar'
import { sameScope, type WatchScope } from '@pommora/core/Paths/exclusion'
import {
  classifyBatch,
  emitWatch,
  isConfigPath,
  pagesChangedIn,
  syncIgnoredUnder,
  tilesChangedIn,
  valueChangesOf,
} from '@pommora/core/Nexus/watchSettle'
import { getHeldAssetMap, refreshAssetMap } from '@pommora/core/Assets/assetMap'
import { readMatrixFile } from '@pommora/core/Matrix/matrixFile'
import { readNavigationFile } from '@pommora/core/Navigation/navigationFile'
import { dropOwnEchoes, isRecentWrite, writtenHash } from '@pommora/core/Files/writeEcho'
import { isMetadataShardRel, NEXUS_DIR } from '@pommora/core/Paths/nexusPaths'
import { join, relative } from '@pommora/core/Paths/posix'
import type { Pushes } from '@pommora/core/Contract/bridge'
import { type CurrentWindow, push } from '../Bridge/ipc'
import { posixPath } from '../Platform/hostPath'
import { seedContentIndex } from '@pommora/core/Index/indexSeed'
import { sessionRoot, type WaitingOpen, waitingOpen } from '@pommora/core/Nexus/session'
import { readWatchScope } from '@pommora/core/Settings/settings'
import { readNexusConfig } from '@pommora/core/Nexus/readNexus'
import { flushValueWrites } from '@pommora/core/Nexus/valuesChanged'
import {
  applyWatchEvents,
  touchesCorpus,
  type WatchEvent,
  type WatchEventName,
  type WatchPatch,
} from '@pommora/core/Nexus/watchPatch'
import { confirmBy } from '@pommora/core/Nexus/mutatePatch'

const SETTLE_MS = 200

let watcher: FSWatcher | null = null
let starts = 0
let settling: Promise<void> = Promise.resolve()
let debounce: ReturnType<typeof setTimeout> | null = null
let batch: WatchEvent[] = []
const configDebounce = new Map<string, ReturnType<typeof setTimeout>>()
const pushedConfig = new Map<string, string>()

// A config file whose section answers live: re-read after the settle, and pushed only when its text moved.
function pushConfig<K extends keyof Pushes>(
  root: string,
  win: CurrentWindow,
  channel: K,
  read: (root: string) => Promise<Pushes[K]>,
): void {
  const held = configDebounce.get(channel)
  if (held) clearTimeout(held)
  configDebounce.set(
    channel,
    setTimeout(async () => {
      if (sessionRoot() !== root) return
      try {
        const value = await read(root)
        const text = JSON.stringify(value)
        if (text === pushedConfig.get(channel)) return
        pushedConfig.set(channel, text)
        push(win, channel, value)
      } catch {
        // Transient FS state mid-sync — the next settle re-reads.
      }
    }, SETTLE_MS),
  )
}

export async function startWatcher(root: string, win: CurrentWindow): Promise<void> {
  if (sessionRoot() !== root) return
  stopWatcher()
  const start = starts
  const scope = await readWatchScope(root)
  // A later start, or a session switch, superseded this one during the settings read.
  if (start !== starts || sessionRoot() !== root) return
  const skip = syncIgnoredUnder(root, scope)
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
      // The app's own writes echo back and confirm through their own channels: a bytes-less echo stops here, and one recorded with its bytes is dropped at the settle while the file still holds them. The two live config files and the metadata month files skip the early stop because each settles to no change when nothing moved, so a hand-edit or sync landing right after the app's own write is not swallowed.
      if (isConfigPath(root, path, 'state'))
        pushConfig(root, win, 'nav:changed', readNavigationFile)
      else if (isConfigPath(root, path, 'matrix'))
        pushConfig(root, win, 'matrix:changed', readMatrixFile)
      else if (!isMetadataShardRel(relative(root, path)) && isRecentWrite(path)) return
      batch.push({ event, absPath: path, written: writtenHash(path) })
      if (debounce) clearTimeout(debounce)
      // Chained, so two settles never reseed the index or re-arm the watcher at once.
      debounce = setTimeout(() => {
        settling = settling.then(() => settle(root, win, scope))
      }, SETTLE_MS)
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

// A waiting open has no scope to watch by, so only `.nexus` is watched, and the Nexus opens once its files read; the watch stops as it reopens, and an open that waits again arms a new one.
export function waitUntilReadable(open: WaitingOpen, reopen: (path: string) => void): void {
  stopWatcher()
  watcher = chokidar
    .watch(join(open.root, NEXUS_DIR), { depth: 0 })
    .on('all', () => {
      if (debounce) clearTimeout(debounce)
      debounce = setTimeout(async () => {
        const readable = await readNexusConfig(open.root).then(
          () => true,
          () => false,
        )
        if (!readable || waitingOpen() !== open) return
        stopWatcher()
        reopen(open.path)
      }, SETTLE_MS)
    })
    .on('error', (error: unknown) => console.error('Nexus watcher error (non-fatal):', error))
}

// Counted, so a start still awaiting its settings read never arms after a later start or a stop.
export function stopWatcher(): void {
  starts++
  if (debounce) {
    clearTimeout(debounce)
    debounce = null
  }
  for (const timer of configDebounce.values()) clearTimeout(timer)
  configDebounce.clear()
  pushedConfig.clear()
  if (watcher) {
    void watcher.close()
    watcher = null
  }
  batch = []
}

/** Patch what classifies, walk for the rest. Pushes only when the tree object moved — an index-only batch changes nothing anyone renders. */
async function settle(root: string, win: CurrentWindow, scope: WatchScope): Promise<void> {
  if (sessionRoot() !== root) return
  const noted = batch
  batch = []
  try {
    const events = await dropOwnEchoes(noted)
    const assetsBefore = getHeldAssetMap(root)
    const named = (path: string): boolean =>
      events.some((ev) => {
        const rel = relative(root, ev.absPath)
        return path === rel || path.startsWith(`${rel}/`)
      })
    let patching!: Promise<WatchPatch>
    const tree = await confirmBy(
      root,
      async () => {
        patching = applyWatchEvents(root, events, scope)
        return (await patching).outcome === 'patched' ? 'ok' : 'refresh'
      },
      named,
    )
    const patch = await patching
    // The map is patch-only, so the fallback walk is where the listing is taken again.
    if (patch.outcome === 'refresh') await refreshAssetMap(root)
    // A session that switched mid-settle must not receive the OLD root's walked tree — a superseded walk still returns it to its awaiters.
    if (sessionRoot() !== root) return
    if (tree) push(win, 'nexus:changed', tree)
    const classified =
      patch.outcome === 'patched' ? patch.classes : classifyBatch(events, root, scope)
    const pages = pagesChangedIn(classified, patch.cascaded.pages)
    if (pages.length) push(win, 'pages:changed', pages)
    // A cascaded linker's write was the app's own, so its note waits in the ledger rather than in the batch.
    const changed = [
      ...valueChangesOf(classified, patch.touched),
      ...flushValueWrites(root, patch.cascaded.pages),
    ]
    if (changed.length) push(win, 'values:changed', changed)
    for (const host of tilesChangedIn(classified, patch.cascaded.hosts))
      push(win, 'tiles:changed', host)
    const assets = getHeldAssetMap(root)
    if (assetsBefore && assets && assets !== assetsBefore) push(win, 'assets:changed', assets)
    if (patch.outcome !== 'refresh') return
    // The corpus may have moved in ways no arm named; the stat-gated seed costs the walk's stats.
    if (touchesCorpus(root, events, scope)) await seedContentIndex(root)
    if (sessionRoot() !== root) return
    // The armed scope is spent state: the classifier and chokidar's ignore filter would keep reading the stale capture, and a changed scope moves the corpus, so its disowned rows are reconciled before the fresh watcher arms.
    if (!sameScope(await readWatchScope(root), scope)) {
      await seedContentIndex(root)
      if (sessionRoot() !== root) return
      void startWatcher(root, win)
    }
  } catch {
    // Transient FS state mid-write — the next settle re-reads (Reload is the fallback).
  }
}
