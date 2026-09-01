// Nothing here is content — the filesystem stays canonical — so a version mismatch drops the file
// and starts clean rather than migrating in place. That costs a user their folds and tab set once,
// exactly as a corrupt sidecar always has; the content-index tables reseed from the corpus at
// open, so a drop costs them nothing at all.

import type { Db } from './driver'

export const SCHEMA_VERSION = 1

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
  CREATE TABLE IF NOT EXISTS indexed_files (
    path TEXT PRIMARY KEY,
    mtime_ms REAL NOT NULL,
    size INTEGER NOT NULL
  );`

export function applySchema(db: Db): void {
  db.exec(DDL)
}

/** The stored version, or null when the meta table / row is absent (⇒ recreate). */
export function readSchemaVersion(db: Db): number | null {
  const hasMeta = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='meta'").get()
  if (!hasMeta) return null
  const row = db.prepare("SELECT value FROM meta WHERE key = 'schema_version'").get() as
    | { value: string }
    | undefined
  if (!row) return null
  const n = Number(row.value)
  return Number.isFinite(n) ? n : null
}

export function stampSchemaVersion(db: Db): void {
  db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', ?)").run(
    String(SCHEMA_VERSION),
  )
}
