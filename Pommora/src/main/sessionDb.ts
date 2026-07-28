// The open nexus's database handle. Operational state — folds, view selection, tabs, previews,
// recents — lives here, opened on nexus open and closed on switch or quit. Best-effort: a null
// handle means every operational store no-ops and the session runs without persisted chrome.

import { errText } from '@shared/result'
import { openNexusDb } from './db/open'
import { importLegacySidecars } from './db/importLegacy'
import type { Db } from './db/driver'

let db: Db | null = null

/** The open nexus's handle, or null when none is open / the database is unavailable. */
export function sessionDb(): Db | null {
  return db
}

/** Open the database for `root`, replacing any prior handle. Never throws: opening a nexus on
 *  read-only media must leave it browsable, not fail the adopt half-way through. */
export function openSessionDb(root: string): void {
  closeSessionDb()
  try {
    db = openNexusDb(root)
    if (db) importLegacySidecars(root)
  } catch (e) {
    console.error('nexus.db: unavailable — operational state will not persist:', errText(e))
    db = null
  }
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
