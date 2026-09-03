// The open nexus's database handle. Operational state — folds, view selection, tabs, previews,
// recents — lives here, opened on nexus open and closed on switch or quit. Best-effort: a null
// handle means every operational store no-ops and the session runs without persisted chrome.

import { errText } from '@shared/result'
import { openNexusDb } from './Database/open'
import { openVersionsDb } from './Database/versionsDb'
import type { Db } from './Database/driver'

let db: Db | null = null
let versionsDb: Db | null = null

export function sessionDb(): Db | null {
  return db
}

export function sessionVersionsDb(): Db | null {
  return versionsDb
}

/** Open the database for `root`, replacing any prior handle. Never throws: opening a nexus on
 *  read-only media must leave it browsable, not fail the adopt half-way through. */
export function openSessionDb(root: string): void {
  closeSessionDb()
  try {
    db = openNexusDb(root)
  } catch (e) {
    console.error('nexus.db: unavailable — operational state will not persist:', errText(e))
    db = null
  }
  try {
    versionsDb = openVersionsDb(root)
  } catch (e) {
    console.error('versions.db: unavailable — file history will not record:', errText(e))
    versionsDb = null
  }
}

const closeQuietly = (handle: Db | null): void => {
  try {
    handle?.close()
  } catch {
    /* best-effort — nothing here outlives the session that needs a clean close */
  }
}

export function closeSessionDb(): void {
  closeQuietly(db)
  closeQuietly(versionsDb)
  db = null
  versionsDb = null
}
