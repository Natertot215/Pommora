import { DatabaseSync } from 'node:sqlite'
import { existsSync, renameSync } from 'node:fs'
import { basename } from 'node:path'
import { errText } from '@pommora/core/Contract/result'
import { fileStamp } from '@pommora/core/Trash/bundle'

export type Db = DatabaseSync

const SQLITE_CORRUPT = 11
const SQLITE_NOTADB = 26

const damagedStore = (errcode: number | undefined): boolean =>
  errcode === SQLITE_CORRUPT || errcode === SQLITE_NOTADB

/** One commit for a batch. `node:sqlite` is synchronous, so nothing else interleaves between the BEGIN and the COMMIT. */
export function inTransaction(db: Db, write: () => void): void {
  db.exec('BEGIN')
  try {
    write()
    db.exec('COMMIT')
  } catch (e) {
    // SQLite ends a transaction itself on some failures, a full disk among them, and a second ROLLBACK would bury the error that caused it.
    if (db.isTransaction) db.exec('ROLLBACK')
    throw e
  }
}

/** A null handle here is LOUD: every operational store silently no-ops behind it, so a quiet failure reads as "Pommora forgot my tabs" with nothing pointing at the cause. The failure's SQLite code rides along, so a caller can tell a damaged file from one that is merely locked. */
export function openDb(path: string): { db: Db | null; errcode?: number } {
  let db: Db | null = null
  try {
    db = new DatabaseSync(path)
    db.exec('PRAGMA journal_mode = WAL')
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

export const damagedError = (e: unknown): boolean =>
  damagedStore((e as { errcode?: number }).errcode)

/** Reads every page, so it suits a store small enough to check at open. */
export function checkIntact(db: Db): void {
  const row = db.prepare('PRAGMA quick_check').get() as { quick_check: string } | undefined
  if (row?.quick_check !== 'ok')
    throw Object.assign(new Error('The store failed its integrity check.'), {
      errcode: SQLITE_CORRUPT,
    })
}

function openPrepared(path: string, prepare: (db: Db) => void): Db | null | 'damaged' {
  const { db, errcode } = openDb(path)
  if (!db) return damagedStore(errcode) ? 'damaged' : null
  try {
    prepare(db)
    return db
  } catch (e) {
    db.close()
    if (damagedError(e)) return 'damaged'
    console.error(
      `${basename(path)}: cannot prepare ${path} — its state will not persist:`,
      errText(e),
    )
    return null
  }
}

/** A store Pommora can rebuild: a file SQLite finds damaged, on open or while `prepare` sets it up, is set aside under a dated name for a fresh one, and nothing is deleted. A locked or unreadable file stays for the next launch. */
export function openRebuildable(path: string, prepare: (db: Db) => void): Db | null {
  const first = openPrepared(path, prepare)
  if (first !== 'damaged') return first
  try {
    renameSync(path, path.replace(/\.db$/, `.corrupt-${fileStamp()}.db`))
  } catch {}
  if (existsSync(path)) {
    console.error(
      `${basename(path)}: damaged and could not be set aside — its state will not persist: ${path}`,
    )
    return null
  }
  const fresh = openPrepared(path, prepare)
  return fresh === 'damaged' ? null : fresh
}
