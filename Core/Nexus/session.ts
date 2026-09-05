// The currently-open nexus for this app run: one window → one nexus (v1), so it's
// a single main-process value (root path, or null) that IPC handlers resolve against.

import { realpath } from 'node:fs/promises'

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
