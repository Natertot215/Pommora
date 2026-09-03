// The page-history store: whole-file snapshots keyed by page id and timestamp, device-local and
// separate from nexus.db so a schema reset there never costs history.

import { existsSync, mkdirSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import { deflateSync, inflateSync } from 'node:zlib'
import { errText } from '@shared/result'
import type { SnapshotRow, SnapshotSource } from '@shared/types'
import { DB_SIBLINGS, openDb, type Db } from './driver'
import { fileStamp } from '../IO/atomicWrite'
import { nexusDir } from '../paths'

export const VERSIONS_FILENAME = 'versions.db'

const DDL = `
  CREATE TABLE IF NOT EXISTS snapshots (
    page_id TEXT NOT NULL,
    ts INTEGER NOT NULL,
    source TEXT NOT NULL,
    blob BLOB NOT NULL,
    PRIMARY KEY (page_id, ts)
  );`

function healthy(db: Db): boolean {
  try {
    const row = db.prepare('PRAGMA quick_check').get() as { quick_check: string } | undefined
    return row?.quick_check === 'ok'
  } catch {
    return false
  }
}

/** A damaged store is set aside under a dated name that still ends in `.db`, so the watcher's
 *  store clause keeps covering it; its WAL and SHM go with it, and nothing is deleted. */
function quarantine(dbPath: string): void {
  const aside = dbPath.replace(/\.db$/, `.corrupt-${fileStamp()}.db`)
  for (const suffix of DB_SIBLINGS) {
    try {
      renameSync(dbPath + suffix, aside + suffix)
    } catch {
      /* the sibling was never written */
    }
  }
}

function withTable(db: Db | null): Db | null {
  try {
    db?.exec(DDL)
    return db
  } catch (e) {
    console.error(
      'versions.db: cannot create its table — file history will not record:',
      errText(e),
    )
    db?.close()
    return null
  }
}

export function openVersionsDb(nexusRoot: string): Db | null {
  const dir = nexusDir(nexusRoot)
  mkdirSync(dir, { recursive: true })
  const dbPath = join(dir, VERSIONS_FILENAME)
  if (existsSync(dbPath)) {
    const existing = openDb(dbPath)
    if (existing && healthy(existing)) return withTable(existing)
    existing?.close()
    quarantine(dbPath)
    if (existsSync(dbPath)) {
      console.error(
        `versions.db: damaged and could not be set aside — file history is off: ${dbPath}`,
      )
      return null
    }
  }
  return withTable(openDb(dbPath))
}

export function addSnapshot(
  db: Db,
  pageId: string,
  ts: number,
  source: SnapshotSource,
  text: string,
): void {
  db.prepare(
    'INSERT OR REPLACE INTO snapshots (page_id, ts, source, blob) VALUES (?, ?, ?, ?)',
  ).run(pageId, ts, source, deflateSync(text))
}

const inflate = (blob: Uint8Array): string => inflateSync(blob).toString('utf8')

export function latestSnapshot(db: Db, pageId: string): { ts: number; text: string } | null {
  const row = db
    .prepare('SELECT ts, blob FROM snapshots WHERE page_id = ? ORDER BY ts DESC LIMIT 1')
    .get(pageId) as { ts: number; blob: Uint8Array } | undefined
  return row ? { ts: row.ts, text: inflate(row.blob) } : null
}

export function listSnapshots(db: Db, pageId: string): SnapshotRow[] {
  const rows = db
    .prepare('SELECT ts, source FROM snapshots WHERE page_id = ? ORDER BY ts DESC')
    .all(pageId) as { ts: number; source: SnapshotSource }[]
  return rows.map(({ ts, source }) => ({ ts, source }))
}

export function readSnapshot(db: Db, pageId: string, ts: number): string | null {
  const row = db
    .prepare('SELECT blob FROM snapshots WHERE page_id = ? AND ts = ?')
    .get(pageId, ts) as { blob: Uint8Array } | undefined
  return row ? inflate(row.blob) : null
}

const removed = (run: { changes: number | bigint }): number => Number(run.changes)

const DELETE_CHUNK = 500

export function deleteSnapshots(db: Db, pageId: string, ts: readonly number[]): number {
  let count = 0
  for (let i = 0; i < ts.length; i += DELETE_CHUNK) {
    const chunk = ts.slice(i, i + DELETE_CHUNK)
    const marks = chunk.map(() => '?').join(', ')
    count += removed(
      db
        .prepare(`DELETE FROM snapshots WHERE page_id = ? AND ts IN (${marks})`)
        .run(pageId, ...chunk),
    )
  }
  return count
}

export function clearSnapshots(db: Db): number {
  return removed(db.prepare('DELETE FROM snapshots').run())
}

export function sweepSnapshots(db: Db, cutoffMs: number): number {
  return removed(db.prepare('DELETE FROM snapshots WHERE ts < ?').run(cutoffMs))
}
