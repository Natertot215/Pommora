import { rmSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { DB_SIBLINGS, openDb, type Db } from './driver'
import {
  applySchema,
  INDEX_GENERATION,
  readMeta,
  SCHEMA_VERSION,
  truncateIndex,
  writeMeta,
} from './ddl'
import { nexusDir } from '@pommora/core/Locations/paths'

export const DB_FILENAME = 'nexus.db'

function removeDbFiles(dbPath: string): void {
  for (const suffix of DB_SIBLINGS) {
    try {
      rmSync(dbPath + suffix, { force: true })
    } catch {}
  }
}

export function openNexusDb(nexusRoot: string): Db | null {
  const dir = nexusDir(nexusRoot)
  mkdirSync(dir, { recursive: true })
  const dbPath = join(dir, DB_FILENAME)

  if (existsSync(dbPath)) {
    const existing = openDb(dbPath).db
    // A file that failed to OPEN (locked, mid-sync, transient I/O) is left intact — the
    // session runs without persisted state and the next launch retries. Only a successful
    // open reporting the wrong schema version earns the drop-and-recreate.
    if (!existing) {
      console.error(
        `nexus.db exists but could not be opened — running without persisted state: ${dbPath}`,
      )
      return null
    }
    if (readMeta(existing, 'schema_version') === String(SCHEMA_VERSION)) {
      // Additive DDL must reach databases that have already been opened — the idempotent
      // re-apply is how a pre-index file gains the index tables without a version bump. A throw
      // (read-only media, a lock) costs only the new tables: the session keeps its folds and
      // tabs, and the index queries answer null so their callers scan.
      try {
        applySchema(existing)
        if (readMeta(existing, 'index_generation') !== String(INDEX_GENERATION)) {
          truncateIndex(existing)
          writeMeta(existing, 'index_generation', String(INDEX_GENERATION))
        }
      } catch (e) {
        console.error(`nexus.db: schema re-apply failed — the content index is unavailable:`, e)
      }
      return existing
    }
    existing.close()
    removeDbFiles(dbPath)
  }

  const db = openDb(dbPath).db
  if (!db) return null
  applySchema(db)
  writeMeta(db, 'schema_version', String(SCHEMA_VERSION))
  writeMeta(db, 'index_generation', String(INDEX_GENERATION))
  return db
}
