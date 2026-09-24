import { realpathSync } from 'node:fs'
import { join } from '@pommora/core/Paths/posix'
import { damagedError, openRebuildable, type Db } from './driver'
import { applySchema, INDEX_GENERATION, readMeta, rebuildIndex, writeMeta } from './ddl'

export const DB_FILENAME = 'nexus.db'

// Root Stamp

const elsewhere = (stamped: string, root: string): boolean => {
  try {
    return realpathSync.native(stamped) !== realpathSync.native(root)
  } catch {
    return true
  }
}

// Open

export function openNexusDb(dir: string, root: string): Db | null {
  return openRebuildable(join(dir, DB_FILENAME), (db) => {
    // Additive DDL must reach databases that have already been opened — the idempotent re-apply is how a pre-index file gains the index tables.
    try {
      applySchema(db)
      if (readMeta(db, 'index_generation') !== String(INDEX_GENERATION)) {
        rebuildIndex(db)
        writeMeta(db, 'index_generation', String(INDEX_GENERATION))
      }
      const stamped = readMeta(db, 'root')
      if (stamped !== null && elsewhere(stamped, root)) db.exec('DELETE FROM sync')
      writeMeta(db, 'root', root)
    } catch (e) {
      if (damagedError(e)) throw e
      console.error(
        'nexus.db: schema re-apply failed — the content index and root stamp are unavailable:',
        e,
      )
    }
  })
}
