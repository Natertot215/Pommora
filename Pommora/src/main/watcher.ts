// Live filesystem watcher: on a debounced settle it re-reads the tree and pushes it to the
// renderer over 'nexus:changed'. No pause flag — an in-app write that echoes back is a
// harmless redundant re-read. ⌘R Reload stays as the manual fallback.

import { relative, sep } from 'node:path'
import chokidar, { type FSWatcher } from 'chokidar'
import type { BrowserWindow } from 'electron'
import { asStringArray } from './coerce'
import { excludedMatcher } from './exclusion'
import { readJsonObject } from './io/atomicWrite'
import { readNavigationFile } from './io/navigationFile'
import { isRecentWrite } from './io/writeEcho'
import { HOMEPAGE_HOST_DIRNAME, nexusConfig, NEXUS_CONFIG_FILES } from './paths'
import { readNexus } from './readNexus'
import { sessionRoot } from './session'

const SETTLE_MS = 200

let watcher: FSWatcher | null = null
let debounce: ReturnType<typeof setTimeout> | null = null
let navDebounce: ReturnType<typeof setTimeout> | null = null

/** A Navigation sidecar / pin file — its changes push nav state only, never a tree re-walk (nav data
 *  isn't in the tree). Matches `.nexus/navFavorites.json` and `.nexus/pins/*` — the two halves of
 *  Navigation that stay files precisely so another machine can sync them in. */
export function isNavPath(root: string, path: string): boolean {
  const segs = relative(root, path).split(sep)
  if (segs[0] !== '.nexus') return false
  return segs[1] === NEXUS_CONFIG_FILES.navFavorites || segs[1] === 'pins'
}

// Ignore only what ISN'T user-meaningful tree content: the SQLite databases (which thrash via
// WAL on every operational write), the .trash, and OS/editor dotfile cruft.
// Crucially we DO watch .nexus/ — Contexts (.nexus/contexts/) and settings/state (accent,
// labels, ordering) live there, so external edits to them must auto-refresh. Checks only
// the path BELOW the root, so a dot-segment in the root's own absolute path (e.g. a nexus
// under ~/.something) can't blank the whole watch.
export function ignoredUnder(root: string, excluded: string[] = []): (path: string) => boolean {
  // User-excluded folders never reach the tree, so their churn must not cost a reconcile
  // (un-excluding a folder mid-session takes effect on the next nexus open / watcher restart).
  const isExcluded = excludedMatcher(excluded)
  return (path) => {
    const rel = relative(root, path)
    if (!rel || rel.startsWith('..')) return false
    const segs = rel.split(sep)
    return (
      segs.some(
        (seg) =>
          seg === '.trash' ||
          seg.startsWith('nexus.db') || // our store + its WAL/SHM
          (seg.startsWith('.') && seg !== '.nexus'), // dotfile cruft, but .nexus holds contexts + settings
      ) ||
      // Block-host content loads through blocks:get, never the tree walk —
      // a debounced block-body write must not cost a full re-walk. The
      // homepage.json config FILE stays watched (the tree reads its banner).
      (segs[0] === '.nexus' && segs[1] === HOMEPAGE_HOST_DIRNAME) ||
      // Space hosts get the same treatment file-granularly: a tile `.md` inside
      // `.nexus/contexts/<C>/<S>/` never walks, while `_space.json` (banner/color/tags
      // the tree reads) stays watched.
      (segs[0] === '.nexus' &&
        segs[1] === 'contexts' &&
        segs.length >= 5 &&
        segs[segs.length - 1].endsWith('.md')) ||
      isExcluded(segs)
    )
  }
}

/** Start (or restart) watching `root`, pushing fresh trees to `win`. */
export async function startWatcher(root: string, win: BrowserWindow): Promise<void> {
  stopWatcher()
  const settings = (await readJsonObject(nexusConfig(root, NEXUS_CONFIG_FILES.settings))) ?? {}
  const excluded = asStringArray(settings.excluded_folders) ?? []
  if (sessionRoot() !== root) return // session switched during the settings read
  watcher = chokidar.watch(root, {
    ignored: ignoredUnder(root, excluded),
    ignoreInitial: true, // existing files aren't "changes"
    persistent: true,
    awaitWriteFinish: { stabilityThreshold: SETTLE_MS, pollInterval: 50 },
    atomic: true, // coalesce the mv-_tmp atomic writes our writers use
  })
  const onEvent = (path: string): void => {
    // The app's own atomic writes echo back here — skip them: every tree-relevant
    // in-app write refetches explicitly, so the echo only buys a wasted full walk
    // (hot under block gestures + embed typing). External edits still walk.
    if (isRecentWrite(path)) return
    if (isNavPath(root, path)) {
      if (navDebounce) clearTimeout(navDebounce)
      navDebounce = setTimeout(() => void pushNav(root, win), SETTLE_MS)
      return
    }
    if (debounce) clearTimeout(debounce)
    debounce = setTimeout(() => void push(root, win), SETTLE_MS)
  }
  watcher
    .on('add', onEvent)
    .on('change', onEvent)
    .on('unlink', onEvent)
    .on('addDir', onEvent)
    .on('unlinkDir', onEvent)
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
}

async function push(root: string, win: BrowserWindow): Promise<void> {
  if (sessionRoot() !== root || win.isDestroyed()) return
  try {
    const tree = await readNexus(root)
    if (!win.isDestroyed()) win.webContents.send('nexus:changed', tree)
  } catch {
    // Transient FS state mid-write — the next settle re-reads (Reload is the fallback).
  }
}

/** Push nav state only — no tree walk. Fires when a favorites or pin file changes externally (a
 *  cross-device sync), so a pin made on another machine surfaces live. Recents ride along from the
 *  database unchanged; the renderer takes the whole shape either way. */
async function pushNav(root: string, win: BrowserWindow): Promise<void> {
  if (sessionRoot() !== root || win.isDestroyed()) return
  try {
    const nav = await readNavigationFile(root)
    if (!win.isDestroyed()) win.webContents.send('nav:changed', nav)
  } catch {
    // Transient FS state mid-sync — the next settle re-reads.
  }
}
