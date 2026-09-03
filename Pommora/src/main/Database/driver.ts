// The SQLite seam. `node:sqlite` lives ONLY behind this module — swapping the driver is a
// one-file change. Node ships it inside Electron's own runtime, so there's no native module to
// compile and no ABI to match.

import { DatabaseSync } from 'node:sqlite'
import { basename } from 'node:path'
import { errText } from '@shared/result'

export type Db = DatabaseSync

/** A store file's suffixes — the file, its WAL, its SHM — for anything that moves or removes one whole. */
export const DB_SIBLINGS = ['', '-wal', '-shm'] as const

/** SQLite's own code for a file that is not a database at all. */
export const SQLITE_NOTADB = 26

/** A null handle here is LOUD: every operational store silently no-ops behind it, so a quiet
 *  failure reads as "Pommora forgot my tabs" with nothing pointing at the cause. The failure's
 *  SQLite code rides along, so a caller can tell a damaged file from one that is merely locked. */
export function openDb(path: string): { db: Db | null; errcode?: number } {
  let db: Db | null = null
  try {
    db = new DatabaseSync(path)
    db.exec('PRAGMA journal_mode = WAL')
    db.exec('PRAGMA foreign_keys = ON')
    return { db }
  } catch (e) {
    db?.close()
    console.error(
      `${basename(path)}: cannot open ${path} — its state will not persist:`,
      errText(e),
    )
    return { db: null, errcode: (e as { errcode?: number }).errcode }
  }
}
