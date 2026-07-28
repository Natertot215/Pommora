// The open nexus's database handle. Operational state — folds, view selection, tabs, previews,
// recents — lives here, opened on nexus open and closed on switch or quit. Best-effort: a null
// handle means every operational store no-ops and the session runs without persisted chrome.

import { openNexusDb } from './db/open'
import type { Db } from './db/driver'

let db: Db | null = null

/** The open nexus's handle, or null when none is open / the database is unavailable. */
export function sessionDb(): Db | null {
  return db
}

/** Open the database for `root`, replacing any prior handle. */
export function openSessionDb(root: string): void {
  closeSessionDb()
  db = openNexusDb(root)
}

/** Close + drop the handle (session switch / app quit). */
export function closeSessionDb(): void {
  if (!db) return
  try {
    db.close()
  } catch {
    /* best-effort — nothing here outlives the session that needs a clean close */
  }
  db = null
}
