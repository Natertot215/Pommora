import { foldKey } from '@pommora/core/Paths/caseFold'
import { ID_KEY } from '@pommora/core/Nexus/identityMark'
import type {
  BaseRecord,
  ContentIndexStore,
  IndexedStat,
  KeyValueStore,
  PageHeading,
  PageRelations,
  PageRelationRow,
  SyncStore,
} from '@pommora/core/Platform/stores'
import { type Db, inTransaction, LISTED } from './driver'
import { INDEX_TABLES } from './ddl'

// A folder's descendants by range, bound to the folder twice: from `dir/` up to `dir0`, exact because '0' is the code point after '/', where a LIKE would let a legal '%' in a folder name over-match.
const UNDER = (column: string): string => `${column} >= ? || '/' AND ${column} < ? || '0'`

export const keyValueStore = (db: Db): KeyValueStore => ({
  get(scope, key) {
    const row = db
      .prepare('SELECT value FROM local_state WHERE scope = ? AND key = ?')
      .get(scope, key) as { value: string } | undefined
    return row?.value ?? null
  },
  write(scope, rows) {
    const drop = db.prepare('DELETE FROM local_state WHERE scope = ? AND key = ?')
    const put = db.prepare(
      'INSERT OR REPLACE INTO local_state (scope, key, value) VALUES (?, ?, ?)',
    )
    inTransaction(db, () => {
      for (const [key, value] of Object.entries(rows))
        if (value === null) drop.run(scope, key)
        else put.run(scope, key, value)
    })
  },
  entries(scope) {
    const rows = db.prepare('SELECT key, value FROM local_state WHERE scope = ?').all(scope) as {
      key: string
      value: string
    }[]
    return Object.fromEntries(rows.map((r) => [r.key, r.value]))
  },
})

const SELECT_STATS = `SELECT f.path, f.mtime_ms, f.size, json_extract(v.value, '$') AS id FROM indexed_files f LEFT JOIN page_values v ON v.path = f.path AND v.key = ? AND json_type(v.value) = 'text' AND v.value <> '""'`
type StatRow = { path: string; mtime_ms: number; size: number; id: string | null }
const statOf = (r: StatRow): IndexedStat => ({
  mtimeMs: r.mtime_ms,
  size: r.size,
  ...(r.id === null ? {} : { id: r.id }),
})

const clearPath = (db: Db, path: string): void => {
  for (const table of INDEX_TABLES) db.prepare(`DELETE FROM ${table} WHERE path = ?`).run(path)
}

export const contentIndexStore = (db: Db): ContentIndexStore => ({
  upsertPageIndexes(rows) {
    const insRelation = db.prepare(
      'INSERT OR REPLACE INTO relations (path, kind, target, qualifier, key) VALUES (?, ?, ?, ?, ?)',
    )
    const insHeading = db.prepare(
      'INSERT OR REPLACE INTO headings (path, text, level, ordinal) VALUES (?, ?, ?, ?)',
    )
    const insValue = db.prepare(
      'INSERT OR REPLACE INTO page_values (path, key, value) VALUES (?, ?, ?)',
    )
    const insFile = db.prepare(
      'INSERT OR REPLACE INTO indexed_files (path, mtime_ms, size) VALUES (?, ?, ?)',
    )
    inTransaction(db, () => {
      for (const { path, entry, stat } of rows) {
        clearPath(db, path)
        for (const { kind, target, qualifier, key } of entry.relations)
          insRelation.run(path, kind, target, qualifier, key)
        entry.headings.forEach(({ text, level }, ordinal) => {
          insHeading.run(path, text, level, ordinal)
        })
        for (const [key, value] of Object.entries(entry.values))
          insValue.run(path, key, JSON.stringify(value) ?? 'null')
        insFile.run(path, stat.mtimeMs, stat.size)
      }
    })
  },
  removePathIndex(path) {
    clearPath(db, path)
  },
  renamePathIndex(oldPath, newPath) {
    for (const table of INDEX_TABLES) {
      db.prepare(`UPDATE OR REPLACE ${table} SET path = ? WHERE path = ?`).run(newPath, oldPath)
    }
  },
  removePathPrefixIndex(dir) {
    for (const table of INDEX_TABLES) {
      db.prepare(`DELETE FROM ${table} WHERE ${UNDER('path')}`).run(dir, dir)
    }
  },
  renamePathPrefixIndex(oldDir, newDir) {
    for (const table of INDEX_TABLES) {
      // The suffix offset is computed by SQL's own length() — SQLite counts characters where a JS .length counts UTF-16 units, and mixing the two swallows the separator after any astral character.
      db.prepare(
        `UPDATE OR REPLACE ${table} SET path = ? || substr(path, length(?) + 1) WHERE ${UNDER('path')}`,
      ).run(newDir, oldDir, oldDir, oldDir)
    }
  },
  // Qualifier-agnostic unless one is asked for: a page that links only `[[Alpha#Intro]]` names Alpha, and a predicate narrowing to the unqualified row would drop it from the rename cascade silently. DISTINCT because one page reaches one target through several kinds and qualifiers.
  queryMentions(keys, qualifier) {
    const qualified = qualifier === undefined ? [] : [qualifier]
    return paths(
      db,
      `SELECT DISTINCT path FROM relations WHERE target IN ${LISTED}${qualified.length ? ' AND qualifier = ?' : ''} AND kind <> 'space' ORDER BY path`,
      JSON.stringify(keys),
      ...qualified,
    )
  },
  readHeadings(only) {
    const rows = (
      only
        ? db
            .prepare(
              `SELECT path, text, level FROM headings WHERE path IN ${LISTED} ORDER BY path, ordinal`,
            )
            .all(JSON.stringify(only))
        : db.prepare('SELECT path, text, level FROM headings ORDER BY path, ordinal').all()
    ) as { path: string; text: string; level: number }[]
    const out: Record<string, PageHeading[]> = {}
    for (const p of only ?? paths(db, 'SELECT path FROM indexed_files')) out[p] = []
    for (const { path, text, level } of rows) {
      out[path] ??= []
      out[path].push({ text, level })
    }
    return out
  },
  readPageRelations(only, key) {
    const inClause = only ? ` AND path IN ${LISTED}` : ''
    const args = only ? [JSON.stringify(only)] : []
    const relations = db
      .prepare(
        `SELECT path, kind, target, qualifier, key FROM relations WHERE kind <> 'space'${inClause} ORDER BY path`,
      )
      .all(...args) as unknown as PageRelationRow[]
    const stats = db
      .prepare(`SELECT path, mtime_ms FROM indexed_files WHERE 1=1${inClause}`)
      .all(...args) as { path: string; mtime_ms: number }[]
    const keyed = key === undefined ? [] : [key]
    const values = db
      .prepare(
        `SELECT path, key, value FROM page_values WHERE 1=1${inClause}${keyed.length ? ' AND key = ?' : ''}`,
      )
      .all(...args, ...keyed) as { path: string; key: string; value: string }[]
    const pages: PageRelations['pages'] = {}
    for (const s of stats) pages[s.path] = { values: {}, mtimeMs: s.mtime_ms }
    for (const v of values) {
      const page = pages[v.path]
      if (page) page.values[v.key] = JSON.parse(v.value)
    }
    return { relations, pages }
  },
  queryKeyHolders(key) {
    return paths(db, 'SELECT path FROM page_values WHERE key = ? ORDER BY path', key)
  },
  queryMembers(key, title) {
    return paths(
      db,
      "SELECT DISTINCT path FROM relations WHERE kind = 'space' AND qualifier = ? AND target = ? ORDER BY path",
      key,
      title,
    )
  },
  readIndexedStat(path) {
    const row = db.prepare(`${SELECT_STATS} WHERE f.path = ?`).get(ID_KEY, path) as
      | StatRow
      | undefined
    return row ? statOf(row) : null
  },
  readIndexedStats(under) {
    const rows = (
      under === undefined
        ? db.prepare(SELECT_STATS).all(ID_KEY)
        : db.prepare(`${SELECT_STATS} WHERE ${UNDER('f.path')}`).all(ID_KEY, under, under)
    ) as StatRow[]
    return new Map(rows.map((r) => [r.path, statOf(r)]))
  },
})

const paths = (db: Db, sql: string, ...params: string[]): string[] =>
  (db.prepare(sql).all(...params) as { path: string }[]).map((r) => r.path)

type BaseRow = {
  path: string
  mtime_ms: number
  size: number
  hash: string
  blob_sha: string
  version: number
  base_bytes: Uint8Array | null
}

const BASE_COLUMNS = 'path, mtime_ms, size, hash, blob_sha, version, base_bytes'

const baseRecord = (row: BaseRow): BaseRecord => ({
  path: row.path,
  mtimeMs: row.mtime_ms,
  size: row.size,
  hash: row.hash,
  blobSha: row.blob_sha,
  version: row.version,
  baseBytes: row.base_bytes === null ? null : new Uint8Array(row.base_bytes),
})

export const syncStore = (db: Db): SyncStore => ({
  readBase(path) {
    const row = db
      .prepare(`SELECT ${BASE_COLUMNS} FROM sync_base WHERE fold = ?`)
      .get(foldKey(path)) as BaseRow | undefined
    return row ? baseRecord(row) : null
  },
  readAllBases() {
    return (db.prepare(`SELECT ${BASE_COLUMNS} FROM sync_base`).all() as BaseRow[]).map(baseRecord)
  },
  readBasesUnder(prefix) {
    const fold = foldKey(prefix)
    return (
      db
        .prepare(`SELECT ${BASE_COLUMNS} FROM sync_base WHERE ${UNDER('fold')}`)
        .all(fold, fold) as BaseRow[]
    ).map(baseRecord)
  },
  upsertBase(record) {
    db.prepare(
      `INSERT OR REPLACE INTO sync_base (fold, ${BASE_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      foldKey(record.path),
      record.path,
      record.mtimeMs,
      record.size,
      record.hash,
      record.blobSha,
      record.version,
      record.baseBytes,
    )
  },
  renameBase(oldPath, newPath) {
    db.prepare('UPDATE OR REPLACE sync_base SET fold = ?, path = ? WHERE fold = ?').run(
      foldKey(newPath),
      newPath,
      foldKey(oldPath),
    )
  },
  deleteBase(path) {
    db.prepare('DELETE FROM sync_base WHERE fold = ?').run(foldKey(path))
  },
})
