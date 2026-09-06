import { DatabaseSync } from 'node:sqlite'
import { basename } from 'node:path'
import { errText } from '@pommora/core/Contract/result'

export type Db = DatabaseSync

export const DB_SIBLINGS = ['', '-wal', '-shm'] as const

const SQLITE_CORRUPT = 11
const SQLITE_NOTADB = 26

export const damagedStore = (errcode: number | undefined): boolean =>
  errcode === SQLITE_CORRUPT || errcode === SQLITE_NOTADB

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
