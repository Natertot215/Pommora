// The per-session SQLite index handle. The index is a regeneratable accelerator off the read
// path (the sidebar reads the filesystem via readNexus), so opening it is best-effort:
// rebuildIndex returns null on any failure and the app runs file-only.
//
// Kept separate from session.ts (which owns only the root path) so that module stays pure
// Node with no native dependency; the better-sqlite3 import enters the graph only here.

import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { rebuildIndex } from './index/build'
import { nexusDir } from './paths'
import type { Db } from './index/db'

let db: Db | null = null

/** The open nexus's index handle, or null when none is open / the index is unavailable. */
export function sessionDb(): Db | null {
  return db
}

/**
 * Open the index for `root`, cold-building it if the version handshake requires, and keep
 * the handle for this session (replacing any prior one). Best-effort + never throws: a null
 * outcome (corrupt DB, native-load failure, unreadable nexus) just means file-only reads.
 */
export async function openSessionIndex(root: string): Promise<void> {
  closeSessionIndex()
  try {
    db = await rebuildIndex(root)
  } catch {
    db = null
  }
}

async function dropAndRebuild(root: string): Promise<void> {
  closeSessionIndex() // release the handle + flush WAL so the file delete is clean
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      rmSync(join(nexusDir(root), `index.db${suffix}`), { force: true })
    } catch {
      /* best-effort */
    }
  }
  await openSessionIndex(root)
}

/** In-flight rebuild, and whether the files changed again while it ran. */
let rebuilding: Promise<void> | null = null
let restale = false

/**
 * Rebuild the index from the (now-mutated) files after a mutation. The index has no
 * incremental updater yet, so this drops index.db + cold-rebuilds. Never throws, so the
 * mutate layer fire-and-forgets it off the UI path.
 *
 * At most ONE rebuild runs at a time, with at most one more queued behind it: the rebuild
 * deletes index.db before rewriting it, so a second overlapping call would unlink the file
 * the first is still writing and leave its handle pointing at nothing.
 */
export function refreshSessionIndex(root: string): Promise<void> {
  if (rebuilding) {
    restale = true
    return rebuilding
  }
  rebuilding = (async () => {
    try {
      do {
        restale = false
        await dropAndRebuild(root)
      } while (restale)
    } finally {
      // Released even if a rebuild throws — a latched promise here would wedge every
      // later refresh behind a failure the index is supposed to shrug off.
      rebuilding = null
    }
  })()
  return rebuilding
}

/** Settle once no rebuild is in flight. `mutate` fires its refresh and doesn't wait, so a caller
 *  tearing the nexus down — a test's temp dir, a session switch — needs a point where the index
 *  has stopped writing into `.nexus`, or the removal races the rebuild that is still filling it. */
export function indexIdle(): Promise<void> {
  return rebuilding ?? Promise.resolve()
}

/** Close + drop the current index handle (session switch / app quit). */
export function closeSessionIndex(): void {
  if (db) {
    try {
      db.close()
    } catch {
      /* best-effort — a regeneratable index never needs a clean close */
    }
    db = null
  }
}
