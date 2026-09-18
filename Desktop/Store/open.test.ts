import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rm, readFile, rename, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from '@pommora/core/Paths/posix'
import { tempRoot } from '@pommora/core/Testing/hostFs'
import { openNexusDb, DB_FILENAME } from './open'
import { INDEX_GENERATION, INDEX_TABLES, readMeta } from './ddl'
import { openDb, type Db } from './driver'
import { closeSessionDb, openSessionDb } from './sessionDb'
import { readScope } from '@pommora/core/Platform/localState'
import { markIndexReady, queryMentions, upsertPageIndex } from '@pommora/core/Index/contentIndex'

// Fixtures

let root: string
let dir: string
beforeEach(() => {
  root = tempRoot('pom-db-open-')
  dir = tempRoot('pom-db-store-')
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
  await rm(dir, { recursive: true, force: true })
})

const caseSensitive = !existsSync(tmpdir().toUpperCase())

const opened = (at: string = root): Db => {
  const db = openNexusDb(dir, at)
  if (!db) throw new Error('the store did not open')
  return db
}
const seed = (db: Db, key: string): void => {
  db.prepare(
    "INSERT OR REPLACE INTO local_state (scope, key, value) VALUES ('folds', ?, '[]')",
  ).run(key)
}
const seedBase = (db: Db): void => {
  db.prepare(
    "INSERT INTO sync (path, mtime_ms, size, hash, blob_sha, version) VALUES ('a.md', 1, 1, 'h', 'b', 1)",
  ).run()
}
const keys = (db: Db): string[] =>
  (db.prepare('SELECT key FROM local_state').all() as { key: string }[]).map((r) => r.key)
const count = (db: Db, table: string): number =>
  (db.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n

// Open

describe('openNexusDb', () => {
  it('creates the file, applies the schema, and stamps the index generation and root', () => {
    const db = opened()
    expect(existsSync(join(dir, DB_FILENAME))).toBe(true)
    expect(readMeta(db, 'index_generation')).toBe(String(INDEX_GENERATION))
    expect(readMeta(db, 'root')).toBe(root)
    db.close()
  })

  it('reuses an existing file, data intact', () => {
    const first = opened()
    seed(first, 'p1')
    first.close()

    const second = opened()
    expect(keys(second)).toEqual(['p1'])
    second.close()
  })

  it('a stale index generation rebuilds the index tables, drops the retired ones, and keeps the rest', () => {
    const first = opened()
    for (const scope of ['aliases', 'folds', 'tabs']) {
      first
        .prepare('INSERT INTO local_state (scope, key, value) VALUES (?, ?, ?)')
        .run(scope, 'k', '{}')
    }
    first
      .prepare("INSERT INTO page_values (path, key, value) VALUES ('a.md', 'Status', '\"x\"')")
      .run()
    first
      .prepare(
        "INSERT INTO matrix_nodes (path, kind, target, qualifier, count) VALUES ('a.md', 'body', 'x', '', 1)",
      )
      .run()
    first.prepare("INSERT INTO indexed_files (path, mtime_ms, size) VALUES ('a.md', 1, 1)").run()
    // A table this generation retired, as a database written before the merge still carries it.
    first.exec('CREATE TABLE mentions (path TEXT NOT NULL, title TEXT NOT NULL)')
    first.prepare("INSERT INTO mentions (path, title) VALUES ('a.md', 'x')").run()
    first.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('index_generation', '1')").run()
    first.close()

    const second = opened()
    expect(count(second, 'local_state')).toBe(3)
    for (const table of INDEX_TABLES) expect(count(second, table)).toBe(0)
    const named = (name: string): number =>
      (
        second
          .prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = ?")
          .get(name) as { n: number }
      ).n
    for (const retired of ['mentions', 'heading_mentions', 'memberships'])
      expect(named(retired)).toBe(0)
    expect(readMeta(second, 'index_generation')).toBe(String(INDEX_GENERATION))
    second.close()
  })

  it('the current index generation keeps the index across a reopen', () => {
    const first = opened()
    first
      .prepare("INSERT INTO page_values (path, key, value) VALUES ('a.md', 'Status', '\"x\"')")
      .run()
    first.close()

    const second = opened()
    expect(count(second, 'page_values')).toBe(1)
    second.close()
  })

  it('leaves a file it could not open intact', async () => {
    const dbPath = join(dir, DB_FILENAME)
    await writeFile(dbPath, 'not a database', 'utf8')
    expect(openNexusDb(dir, root)).toBeNull()
    expect(await readFile(dbPath, 'utf8')).toBe('not a database')
  })
})

// Root Stamp

describe('the root stamp', () => {
  it('keeps every row at the same root, whatever schema_version a file carries', () => {
    const first = opened()
    seed(first, 'p1')
    seedBase(first)
    first.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '0')").run()
    first.close()

    const second = opened()
    expect(keys(second)).toEqual(['p1'])
    expect(count(second, 'sync')).toBe(1)
    second.close()
  })

  it('empties the sync bases when the stamped root is gone, keeping every other row', async () => {
    const first = opened()
    seed(first, 'p1')
    seedBase(first)
    first.close()
    const moved = `${root}-moved`
    await rename(root, moved)
    try {
      const second = opened(moved)
      expect(keys(second)).toEqual(['p1'])
      expect(count(second, 'sync')).toBe(0)
      expect(readMeta(second, 'root')).toBe(moved)
      second.close()
    } finally {
      await rename(moved, root)
    }
  })

  it('empties the sync bases when the stamped root is another folder that still exists', async () => {
    const first = opened()
    seed(first, 'p1')
    seedBase(first)
    first.close()
    const copy = tempRoot('pom-db-copy-')
    try {
      const second = opened(copy)
      expect(keys(second)).toEqual(['p1'])
      expect(count(second, 'sync')).toBe(0)
      expect(readMeta(second, 'root')).toBe(copy)
      second.close()
    } finally {
      await rm(copy, { recursive: true, force: true })
    }
  })

  it.skipIf(caseSensitive)(
    'keeps the sync bases when the same folder is reached through another case',
    () => {
      const first = opened()
      seedBase(first)
      first.close()

      const second = opened(root.toUpperCase())
      expect(count(second, 'sync')).toBe(1)
      second.close()
    },
  )
})

// Upgrade

const STAT = { mtimeMs: 1000, size: 10 }

describe('upgrade in place', () => {
  it('a pre-index database gains the tables on open with its rows intact', () => {
    // A database as the pre-index schema wrote it: meta + local_state alone, stamped v1.
    const v1 = openDb(join(dir, DB_FILENAME)).db
    if (!v1) throw new Error('fixture db failed to open')
    v1.exec(`
      CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE local_state (scope TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL,
        PRIMARY KEY (scope, key));
      INSERT INTO meta (key, value) VALUES ('schema_version', '1');
      INSERT INTO local_state (scope, key, value) VALUES ('folds', 'p1', '["x"]');
    `)
    v1.close()

    openSessionDb(dir, root)
    markIndexReady()
    expect(readScope('folds')).toEqual({ p1: ['x'] })
    upsertPageIndex(
      'Notes/A.md',
      {
        matrix: [{ kind: 'body', target: 'beta', qualifier: '', count: 1 }],
        headings: [],
        values: {},
      },
      STAT,
    )
    expect(queryMentions('beta')).toEqual(['Notes/A.md'])
    expect(readScope('folds')).toEqual({ p1: ['x'] })
    closeSessionDb()
  })
})
