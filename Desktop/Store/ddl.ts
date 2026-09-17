import type { Db } from './driver'

export const INDEX_GENERATION = 5

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
  CREATE TABLE IF NOT EXISTS mentions (
    path TEXT NOT NULL,
    title TEXT NOT NULL,
    PRIMARY KEY (path, title)
  );
  CREATE INDEX IF NOT EXISTS mentions_by_title ON mentions (title);
  CREATE TABLE IF NOT EXISTS headings (
    path TEXT NOT NULL,
    heading TEXT NOT NULL,
    ordinal INTEGER NOT NULL,
    PRIMARY KEY (path, heading)
  );
  CREATE TABLE IF NOT EXISTS heading_mentions (
    path TEXT NOT NULL,
    title TEXT NOT NULL,
    heading TEXT NOT NULL,
    PRIMARY KEY (path, title, heading)
  );
  CREATE INDEX IF NOT EXISTS heading_mentions_by_target ON heading_mentions (title, heading);
  CREATE TABLE IF NOT EXISTS page_values (
    path TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (path, key)
  );
  CREATE INDEX IF NOT EXISTS page_values_by_key ON page_values (key);
  CREATE TABLE IF NOT EXISTS memberships (
    path TEXT NOT NULL,
    key TEXT NOT NULL,
    title TEXT NOT NULL,
    PRIMARY KEY (path, key, title)
  );
  CREATE INDEX IF NOT EXISTS memberships_by_title ON memberships (key, title);
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

export const INDEX_TABLES = [
  'mentions',
  'headings',
  'heading_mentions',
  'page_values',
  'memberships',
  'indexed_files',
] as const

export function truncateIndex(db: Db): void {
  db.exec(INDEX_TABLES.map((table) => `DELETE FROM ${table};`).join(' '))
}

// A generation step drops the index tables outright, so a table whose shape changed is recreated rather than kept as it was.
export function rebuildIndex(db: Db): void {
  db.exec(INDEX_TABLES.map((table) => `DROP TABLE IF EXISTS ${table};`).join(' '))
  applySchema(db)
}
