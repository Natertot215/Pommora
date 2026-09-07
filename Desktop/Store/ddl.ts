// Nothing here is content — the filesystem stays canonical — so a version mismatch drops the file and starts clean rather than migrating in place. That costs a user every device-local row at once, so the content index has its own generation below and never reaches for that lever.

import type { Db } from './driver'

export const SCHEMA_VERSION = 1
export const INDEX_GENERATION = 3

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
  );`

export function applySchema(db: Db): void {
  db.exec(DDL)
}

export function readMeta(db: Db, key: string): string | null {
  const hasMeta = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='meta'").get()
  if (!hasMeta) return null
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? null
}

export function writeMeta(db: Db, key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(key, value)
}

export const INDEX_TABLES = ['mentions', 'page_values', 'memberships', 'indexed_files'] as const

export function truncateIndex(db: Db): void {
  db.exec(INDEX_TABLES.map((table) => `DELETE FROM ${table};`).join(' '))
}
