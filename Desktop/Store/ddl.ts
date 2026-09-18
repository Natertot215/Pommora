import type { Db } from './driver'

export const INDEX_GENERATION = 6

const DDL = `
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS local_state (
    scope TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (scope, key)
  );
  CREATE TABLE IF NOT EXISTS matrix_nodes (
    path TEXT NOT NULL,
    kind TEXT NOT NULL,
    target TEXT NOT NULL,
    qualifier TEXT NOT NULL,
    count INTEGER NOT NULL,
    PRIMARY KEY (path, kind, target, qualifier)
  );
  CREATE INDEX IF NOT EXISTS matrix_nodes_by_target ON matrix_nodes (target, qualifier, kind);
  CREATE TABLE IF NOT EXISTS headings (
    path TEXT NOT NULL,
    heading TEXT NOT NULL,
    ordinal INTEGER NOT NULL,
    PRIMARY KEY (path, heading)
  );
  CREATE TABLE IF NOT EXISTS page_values (
    path TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (path, key)
  );
  CREATE INDEX IF NOT EXISTS page_values_by_key ON page_values (key);
  CREATE TABLE IF NOT EXISTS indexed_files (
    path TEXT PRIMARY KEY,
    mtime_ms REAL NOT NULL,
    size INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sync (
    path TEXT PRIMARY KEY,
    mtime_ms REAL NOT NULL,
    size INTEGER NOT NULL,
    hash TEXT NOT NULL,
    blob_sha TEXT NOT NULL,
    version INTEGER NOT NULL,
    base_bytes BLOB
  );`

export function applySchema(db: Db): void {
  db.exec(DDL)
}

export function readMeta(db: Db, key: string): string | null {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? null
}

export function writeMeta(db: Db, key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(key, value)
}

export const INDEX_TABLES = ['matrix_nodes', 'headings', 'page_values', 'indexed_files'] as const

// Names a generation has retired. `applySchema` only ever creates, so a table dropped from the schema is dropped from an existing database here or never.
const RETIRED_TABLES = ['mentions', 'heading_mentions', 'memberships'] as const

// A generation step drops every index table and every retired name outright, so a table whose shape changed is recreated and one whose rows moved elsewhere is gone.
export function rebuildIndex(db: Db): void {
  db.exec(
    [...INDEX_TABLES, ...RETIRED_TABLES].map((table) => `DROP TABLE IF EXISTS ${table};`).join(' '),
  )
  applySchema(db)
}
