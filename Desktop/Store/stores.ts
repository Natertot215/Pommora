import type { KeyValueStore } from '@pommora/core/Platform/machine'
import type { ContentIndexStore, IndexedStat, SnapshotStore } from '@pommora/core/Platform/stores'
import type { Db } from './driver'
import {
  addSnapshot,
  clearSnapshots,
  deleteSnapshots,
  latestSnapshot,
  listSnapshots,
  readSnapshot,
  sweepSnapshots,
} from './versionsDb'

export const keyValueStore = (db: Db): KeyValueStore => ({
  get(scope, key) {
    const row = db
      .prepare('SELECT value FROM local_state WHERE scope = ? AND key = ?')
      .get(scope, key) as { value: string } | undefined
    return row?.value ?? null
  },
  set(scope, key, value) {
    if (value === null)
      db.prepare('DELETE FROM local_state WHERE scope = ? AND key = ?').run(scope, key)
    else
      db.prepare('INSERT OR REPLACE INTO local_state (scope, key, value) VALUES (?, ?, ?)').run(
        scope,
        key,
        value,
      )
  },
  entries(scope) {
    const rows = db.prepare('SELECT key, value FROM local_state WHERE scope = ?').all(scope) as {
      key: string
      value: string
    }[]
    return Object.fromEntries(rows.map((r) => [r.key, r.value]))
  },
})

const INDEX_TABLES = ['mentions', 'page_values', 'indexed_files'] as const

// The prefix pair `path >= dir||'/' AND path < dir||'0'` selects `dir`'s descendants by range — exact because '0' is the code point after '/', where a LIKE would let a legal '%' in a folder name over-match.
export const contentIndexStore = (db: Db): ContentIndexStore => ({
  upsertPageIndex(path, entry, stat) {
    db.prepare('DELETE FROM mentions WHERE path = ?').run(path)
    db.prepare('DELETE FROM page_values WHERE path = ?').run(path)
    const insMention = db.prepare('INSERT OR REPLACE INTO mentions (path, title) VALUES (?, ?)')
    for (const title of entry.mentions) insMention.run(path, title)
    const insValue = db.prepare(
      'INSERT OR REPLACE INTO page_values (path, key, value) VALUES (?, ?, ?)',
    )
    for (const [key, value] of Object.entries(entry.values)) {
      insValue.run(path, key, JSON.stringify(value) ?? 'null')
    }
    // The gate row lands LAST, so a write that dies part-way leaves a stale stat and the next seed re-reads the file.
    db.prepare('INSERT OR REPLACE INTO indexed_files (path, mtime_ms, size) VALUES (?, ?, ?)').run(
      path,
      stat.mtimeMs,
      stat.size,
    )
  },
  removePathIndex(path) {
    for (const table of INDEX_TABLES) db.prepare(`DELETE FROM ${table} WHERE path = ?`).run(path)
  },
  renamePathIndex(oldPath, newPath) {
    for (const table of INDEX_TABLES) {
      db.prepare(`UPDATE OR REPLACE ${table} SET path = ? WHERE path = ?`).run(newPath, oldPath)
    }
  },
  removePathPrefixIndex(dir) {
    for (const table of INDEX_TABLES) {
      db.prepare(`DELETE FROM ${table} WHERE path >= ? || '/' AND path < ? || '0'`).run(dir, dir)
    }
  },
  renamePathPrefixIndex(oldDir, newDir) {
    for (const table of INDEX_TABLES) {
      // The suffix offset is computed by SQL's own length() — SQLite counts characters where a JS .length counts UTF-16 units, and mixing the two swallows the separator after any astral character.
      db.prepare(
        `UPDATE OR REPLACE ${table} SET path = ? || substr(path, length(?) + 1) WHERE path >= ? || '/' AND path < ? || '0'`,
      ).run(newDir, oldDir, oldDir, oldDir)
    }
  },
  queryMentions(normalizedTitle) {
    return paths(db, 'SELECT path FROM mentions WHERE title = ? ORDER BY path', normalizedTitle)
  },
  queryKeyHolders(key) {
    return paths(db, 'SELECT path FROM page_values WHERE key = ? ORDER BY path', key)
  },
  readIndexedStat(path) {
    const row = db.prepare('SELECT mtime_ms, size FROM indexed_files WHERE path = ?').get(path) as
      | { mtime_ms: number; size: number }
      | undefined
    return row ? { mtimeMs: row.mtime_ms, size: row.size } : null
  },
  readIndexedStats() {
    const rows = db.prepare('SELECT path, mtime_ms, size FROM indexed_files').all() as {
      path: string
      mtime_ms: number
      size: number
    }[]
    return new Map<string, IndexedStat>(
      rows.map((r) => [r.path, { mtimeMs: r.mtime_ms, size: r.size }]),
    )
  },
})

const paths = (db: Db, sql: string, param: string): string[] =>
  (db.prepare(sql).all(param) as { path: string }[]).map((r) => r.path)

export const snapshotStore = (db: Db): SnapshotStore => ({
  addSnapshot: (pageId, ts, source, text) => addSnapshot(db, pageId, ts, source, text),
  latestSnapshot: (pageId) => latestSnapshot(db, pageId),
  listSnapshots: (pageId) => listSnapshots(db, pageId),
  readSnapshot: (pageId, ts) => readSnapshot(db, pageId, ts),
  deleteSnapshots: (pageId, ts) => deleteSnapshots(db, pageId, ts),
  clearSnapshots: () => clearSnapshots(db),
  sweepSnapshots: (cutoffMs) => sweepSnapshots(db, cutoffMs),
})
