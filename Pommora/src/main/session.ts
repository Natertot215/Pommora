// The currently-open nexus for this app run: one window → one nexus (v1), so it's
// a single main-process value (root path, or null) that IPC handlers resolve against.

import { realpath, stat } from 'node:fs/promises'
import type { AppConfig } from './appConfig'
import { TRASH_DIR } from '@shared/nexusPaths'

let currentRoot: string | null = null

/** The open nexus root, or null when nothing is open. */
export function sessionRoot(): string | null {
  return currentRoot
}

/** Stores the CANONICALIZED (realpath) root: a symlinked ancestry (macOS /var→/private/var, an
 *  external mount) would otherwise key resolveUnderRoot differently and split cell-write locks
 *  across buckets, breaking serialization. Falls back to the raw path if realpath fails. */
export async function openSession(root: string): Promise<void> {
  currentRoot = await realpath(root).catch(() => root)
}

/** Close the current nexus (back to empty state). */
export function closeSession(): void {
  currentRoot = null
}

/** True when `p` exists and is a directory. An unreadable dir surfaces later as a read error. */
export async function isExistingDir(p: string): Promise<boolean> {
  try {
    return (await stat(p)).isDirectory()
  } catch {
    return false
  }
}

/** The persisted lastNexusPath if it still exists, else null. Never prompts — a launch
 *  must not block on a modal (headless runs and tests must not hang). */
export async function resolveRestorePath(config: AppConfig): Promise<string | null> {
  if (config.lastNexusPath && (await isExistingDir(config.lastNexusPath))) {
    return config.lastNexusPath
  }
  return null
}

/** True when any path segment is a trash dir — a recents entry inside one is a deleted
 *  nexus that shouldn't resurface. */
export function isTrashedPath(p: string): boolean {
  return p.split('/').some((seg) => {
    const s = seg.toLowerCase()
    return s === TRASH_DIR || s === '.trashes'
  })
}

/** Filter recents to live, non-trashed directories, order preserved. */
export async function pruneRecents(recents: string[]): Promise<string[]> {
  const keep = await Promise.all(
    recents.map((p) => (isTrashedPath(p) ? Promise.resolve(false) : isExistingDir(p))),
  )
  return recents.filter((_, i) => keep[i])
}
