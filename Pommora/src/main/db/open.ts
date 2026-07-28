// Per-nexus open with the version handshake: a file at the current SCHEMA_VERSION is reused, any
// other version (or a corrupt / unreadable one) is deleted and recreated. Returns null only when
// even a fresh file can't be opened — the caller runs without persisted operational state.
//
// The database travels inside the Nexus so a moved or renamed one keeps it, but it is device-local
// and excluded from the watcher; `index.db` (Swift's) is a different file and is left alone.

import { rmSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { openDb, type Db } from './driver'
import { applySchema, readSchemaVersion, stampSchemaVersion, SCHEMA_VERSION } from './schema'
import { nexusDir } from '../paths'

export const DB_FILENAME = 'nexus.db'

/** Drops the WAL/SHM siblings alongside the file — leaving them orphans a journal that SQLite
 *  would replay into the next database created at this path. */
function removeDbFiles(dbPath: string): void {
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      rmSync(dbPath + suffix, { force: true })
    } catch {
      /* best-effort */
    }
  }
}

/** Open (creating / resetting as needed) the per-nexus database. null ⇒ no persisted state. */
export function openNexusDb(nexusRoot: string): Db | null {
  const dir = nexusDir(nexusRoot)
  mkdirSync(dir, { recursive: true })
  const dbPath = join(dir, DB_FILENAME)

  if (existsSync(dbPath)) {
    const existing = openDb(dbPath)
    if (existing) {
      if (readSchemaVersion(existing) === SCHEMA_VERSION) return existing
      existing.close()
    }
    removeDbFiles(dbPath)
  }

  const db = openDb(dbPath)
  if (!db) return null
  applySchema(db)
  stampSchemaVersion(db)
  return db
}
