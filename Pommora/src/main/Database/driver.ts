// The SQLite seam. `node:sqlite` lives ONLY behind this module — swapping the driver is a
// one-file change, callers unchanged. Node ships it inside Electron's own runtime, so there is
// no native module to compile and no ABI to match.

import { DatabaseSync } from 'node:sqlite'
import { errText } from '@shared/result'

export type Db = DatabaseSync

/** A null handle here is LOUD: every operational store silently no-ops behind it, so a quiet
 *  failure reads as "Pommora forgot my tabs" with nothing pointing at the cause. */
export function openDb(path: string): Db | null {
  try {
    const db = new DatabaseSync(path)
    db.exec('PRAGMA journal_mode = WAL')
    db.exec('PRAGMA foreign_keys = ON')
    return db
  } catch (e) {
    console.error(`nexus.db: cannot open ${path} — operational state will not persist:`, errText(e))
    return null
  }
}
