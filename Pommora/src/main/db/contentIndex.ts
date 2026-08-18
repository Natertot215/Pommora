// The content index — which pages mention which titles, and which property keys and values each
// page carries. Rows are derived from page files and disposable by construction: delete nexus.db
// and the next open reseeds everything. Paths are nexus-relative POSIX (the tree's own
// convention), joined to absolute at the call sites, so a nexus rename invalidates nothing.
//
// A null answer means NO INDEX — a null Db, or tables that never landed on read-only media —
// never "no matches": every query caller falls back to its full scan on null, and an empty
// array is a genuine empty result it may trust. Writers log and continue on failure; the
// open-time seed reconciles whatever they missed.

import { errText } from '@shared/result'
import { sessionDb } from '../sessionDb'
import type { Db } from './driver'

export interface PageIndexEntry {
  /** Normalized titles the page's body names, per the cascade's own mention rules. */
  mentions: string[]
  /** Property-wrapped frontmatter keys → their raw decoded values. */
  values: Record<string, unknown>
}

export interface IndexedStat {
  mtimeMs: number
  size: number
}

const TABLES = ['mentions', 'page_values', 'indexed_files'] as const

function guarded(what: string, run: (db: Db) => void): void {
  const db = sessionDb()
  if (!db) return
  try {
    run(db)
  } catch (e) {
    console.error(`content index: ${what} failed:`, errText(e))
  }
}

/** Replace a page's rows with `entry` and record its stat gate. The gate row lands LAST, so a
 *  write that dies part-way leaves a stale stat and the next seed re-reads the file. */
export function upsertPageIndex(path: string, entry: PageIndexEntry, stat: IndexedStat): void {
  guarded(`upsert ${path}`, (db) => {
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
    db.prepare('INSERT OR REPLACE INTO indexed_files (path, mtime_ms, size) VALUES (?, ?, ?)').run(
      path,
      stat.mtimeMs,
      stat.size,
    )
  })
}

export function removePathIndex(path: string): void {
  guarded(`remove ${path}`, (db) => {
    for (const table of TABLES) db.prepare(`DELETE FROM ${table} WHERE path = ?`).run(path)
  })
}

export function renamePathIndex(oldPath: string, newPath: string): void {
  guarded(`rename ${oldPath}`, (db) => {
    for (const table of TABLES) {
      db.prepare(`UPDATE OR REPLACE ${table} SET path = ? WHERE path = ?`).run(newPath, oldPath)
    }
  })
}

// The prefix pair below selects `dir`'s descendants by range — `path >= dir||'/' AND
// path < dir||'0'` is exact because '0' is the code point after '/', where a LIKE would let
// a legal '%' in a folder name over-match.

export function removePathPrefixIndex(dir: string): void {
  guarded(`remove ${dir}/`, (db) => {
    for (const table of TABLES) {
      db.prepare(`DELETE FROM ${table} WHERE path >= ? || '/' AND path < ? || '0'`).run(dir, dir)
    }
  })
}

export function renamePathPrefixIndex(oldDir: string, newDir: string): void {
  guarded(`rename ${oldDir}/`, (db) => {
    for (const table of TABLES) {
      db.prepare(
        `UPDATE OR REPLACE ${table} SET path = ? || substr(path, ?) WHERE path >= ? || '/' AND path < ? || '0'`,
      ).run(newDir, oldDir.length + 1, oldDir, oldDir)
    }
  })
}

/** Prune every row whose path the corpus enumeration no longer yields. */
export function reconcileIndex(seen: ReadonlySet<string>): void {
  guarded('reconcile', (db) => {
    for (const table of TABLES) {
      const rows = db.prepare(`SELECT DISTINCT path FROM ${table}`).all() as { path: string }[]
      const del = db.prepare(`DELETE FROM ${table} WHERE path = ?`)
      for (const row of rows) if (!seen.has(row.path)) del.run(row.path)
    }
  })
}

function queryPaths(sql: string, param: string): string[] | null {
  const db = sessionDb()
  if (!db) return null
  try {
    return (db.prepare(sql).all(param) as { path: string }[]).map((r) => r.path)
  } catch {
    return null
  }
}

/** Paths whose bodies mention `normalizedTitle`, or null when there is no index. */
export function queryMentions(normalizedTitle: string): string[] | null {
  return queryPaths('SELECT path FROM mentions WHERE title = ? ORDER BY path', normalizedTitle)
}

/** Paths whose frontmatter holds `key`, or null when there is no index. */
export function queryKeyHolders(key: string): string[] | null {
  return queryPaths('SELECT path FROM page_values WHERE key = ? ORDER BY path', key)
}

/** The whole stat gate, or null when there is no index — the seed stands down on null rather
 *  than reading a corpus it has nowhere to record. */
export function readIndexedStats(): Map<string, IndexedStat> | null {
  const db = sessionDb()
  if (!db) return null
  try {
    const rows = db.prepare('SELECT path, mtime_ms, size FROM indexed_files').all() as {
      path: string
      mtime_ms: number
      size: number
    }[]
    return new Map(rows.map((r) => [r.path, { mtimeMs: r.mtime_ms, size: r.size }]))
  } catch {
    return null
  }
}
