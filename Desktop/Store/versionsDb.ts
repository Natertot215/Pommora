import { join } from '@pommora/core/Paths/posix'
import { deflateSync, inflateSync } from 'node:zlib'
import { checkIntact, openRebuildable, type Db } from './driver'
import type { CaptureStore, SnapshotSource, SnapshotStore } from '@pommora/core/Platform/stores'

export const VERSIONS_FILENAME = 'versions.db'

const DDL = `
  CREATE TABLE IF NOT EXISTS snapshots (
    page_id TEXT NOT NULL,
    ts INTEGER NOT NULL,
    source TEXT NOT NULL,
    blob BLOB NOT NULL,
    PRIMARY KEY (page_id, ts)
  );
  CREATE TABLE IF NOT EXISTS captures (
    path TEXT NOT NULL,
    ts INTEGER NOT NULL,
    reason TEXT NOT NULL,
    blob BLOB NOT NULL,
    PRIMARY KEY (path, ts)
  );`

export function openVersionsDb(dir: string): Db | null {
  return openRebuildable(join(dir, VERSIONS_FILENAME), (db) => {
    checkIntact(db)
    db.exec(DDL)
  })
}

const inflate = (blob: Uint8Array): string => inflateSync(blob).toString('utf8')

const removed = (run: { changes: number | bigint }): number => Number(run.changes)

export const snapshotStore = (db: Db): SnapshotStore => ({
  addSnapshot(pageId, ts, source, text) {
    db.prepare(
      'INSERT OR REPLACE INTO snapshots (page_id, ts, source, blob) VALUES (?, ?, ?, ?)',
    ).run(pageId, ts, source, deflateSync(text))
  },
  latestSnapshot(pageId) {
    const row = db
      .prepare('SELECT ts, blob FROM snapshots WHERE page_id = ? ORDER BY ts DESC LIMIT 1')
      .get(pageId) as { ts: number; blob: Uint8Array } | undefined
    return row ? { ts: row.ts, text: inflate(row.blob) } : null
  },
  listSnapshots(pageId) {
    return db
      .prepare('SELECT ts, source FROM snapshots WHERE page_id = ? ORDER BY ts DESC')
      .all(pageId) as { ts: number; source: SnapshotSource }[]
  },
  readSnapshot(pageId, ts) {
    const row = db
      .prepare('SELECT blob FROM snapshots WHERE page_id = ? AND ts = ?')
      .get(pageId, ts) as { blob: Uint8Array } | undefined
    return row ? inflate(row.blob) : null
  },
  deleteSnapshots(pageId, ts) {
    const marks = ts.map(() => '?').join(', ')
    return removed(
      db.prepare(`DELETE FROM snapshots WHERE page_id = ? AND ts IN (${marks})`).run(pageId, ...ts),
    )
  },
  clearSnapshots() {
    const count = removed(db.prepare('DELETE FROM snapshots').run())
    // Under WAL the rebuilt file lands in the journal; the checkpoint is what truncates the store.
    db.exec('VACUUM')
    db.exec('PRAGMA wal_checkpoint(TRUNCATE)')
    return count
  },
  sweepSnapshots(cutoffMs) {
    return removed(db.prepare('DELETE FROM snapshots WHERE ts < ?').run(cutoffMs))
  },
})

export const captureStore = (db: Db): CaptureStore => ({
  addCapture(path, ts, reason, bytes) {
    db.prepare('INSERT OR REPLACE INTO captures (path, ts, reason, blob) VALUES (?, ?, ?, ?)').run(
      path,
      ts,
      reason,
      deflateSync(bytes),
    )
  },
  sweepCaptures(cutoffMs) {
    return removed(db.prepare('DELETE FROM captures WHERE ts < ?').run(cutoffMs))
  },
})
