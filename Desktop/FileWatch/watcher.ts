// Events settle, then apply one at a time through the path the app's own writes take; what they listed missing is stamped before the batch's settle.

import chokidar, { type FSWatcher } from 'chokidar'
import {
  assetMatcher,
  excludedMatcher,
  neverWatched,
  rootSegs,
  type WatchScope,
} from '@pommora/core/Paths/exclusion'
import { escapes } from '@pommora/core/Paths/pathSafety'
import { settleBatch } from '@pommora/core/Nexus/settle'
import { readMatrixFile } from '@pommora/core/Matrix/matrixFile'
import { readNavigationFile } from '@pommora/core/Navigation/navigationFile'
import {
  type Changed,
  type ChangeEvent,
  dropOwnEchoes,
  emitWatch,
  isRecentWrite,
  writtenHash,
} from '@pommora/core/Files/writeEcho'
import { isMetadataShardRel, NEXUS_CONFIG_FILES, NEXUS_DIR } from '@pommora/core/Paths/nexusPaths'
import { join, relative } from '@pommora/core/Paths/posix'
import type { Pushes } from '@pommora/core/Contract/bridge'
import { type CurrentWindow, push } from '../Bridge/ipc'
import { posixPath } from '../Platform/hostPath'
import { sessionRoot, type WaitingOpen, waitingOpen } from '@pommora/core/Nexus/session'
import { readWatchScope } from '@pommora/core/Settings/settings'
import { readNexusConfig } from '@pommora/core/Nexus/readNexus'

const SETTLE_MS = 200

let watcher: FSWatcher | null = null
let starts = 0
let batchQueue: Promise<void> = Promise.resolve()
let debounce: ReturnType<typeof setTimeout> | null = null
let batch: Changed[] = []
const configDebounce = new Map<string, ReturnType<typeof setTimeout>>()
const pushedConfig = new Map<string, string>()

export function isConfigPath(
  root: string,
  path: string,
  file: keyof typeof NEXUS_CONFIG_FILES,
): boolean {
  const segs = relative(root, path).split('/')
  return segs[0] === NEXUS_DIR && segs[1] === NEXUS_CONFIG_FILES[file]
}

// We DO watch .nexus/ — Contexts and settings/state live there. Checks only the path BELOW the root, so a dot-segment in the root's own absolute path (a nexus under ~/.something) can't blank the whole watch.
export function syncIgnoredUnder(root: string, scope: WatchScope): (path: string) => boolean {
  const isExcluded = excludedMatcher(scope.excluded)
  const isAsset = assetMatcher(scope.assetDir)
  const assetDepth = rootSegs(scope.assetDir).length
  return (path) => {
    const rel = relative(root, path)
    if (!rel || escapes(rel)) return false
    const segs = rel.split('/')
    if (isAsset(segs)) return neverWatched(segs.slice(assetDepth))
    return neverWatched(segs) || isExcluded(segs)
  }
}

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
    (event: ChangeEvent) =>
    (hostPath: string): void => {
      const path = posixPath(hostPath)
      emitWatch(event, path)
      // The app's own writes echo back after they have already applied as they landed: a bytes-less echo stops here, and one recorded with its bytes is dropped at the settle while the file still holds them. The two live config files and the metadata month files skip the early stop because each settles to no change when nothing moved, so a hand-edit or sync landing right after the app's own write is not swallowed.
      if (isConfigPath(root, path, 'state'))
        pushConfig(root, win, 'nav:changed', readNavigationFile)
      else if (isConfigPath(root, path, 'matrix'))
        pushConfig(root, win, 'matrix:changed', readMatrixFile)
      else if (!isMetadataShardRel(relative(root, path)) && isRecentWrite(path)) return
      batch.push({ event, absPath: path, origin: 'watched', written: writtenHash(path) })
      if (debounce) clearTimeout(debounce)
      // Chained, so batches apply in the order they settled.
      debounce = setTimeout(() => {
        batchQueue = batchQueue.then(() => drainBatch(root, win))
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

async function drainBatch(root: string, win: CurrentWindow): Promise<void> {
  if (sessionRoot() !== root) return
  const noted = batch
  batch = []
  try {
    await settleBatch(
      {
        push: <K extends keyof Pushes>(channel: K, value: Pushes[K]) => push(win, channel, value),
        watch: (next) => startWatcher(next, win),
      },
      root,
      await dropOwnEchoes(noted),
    )
  } catch {
    // Transient FS state mid-write — the next settle re-reads (Reload is the fallback).
  }
}
