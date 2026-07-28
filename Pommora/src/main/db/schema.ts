// The device-local schema: the `meta` version row plus `local_state`, the one keyed store every
// operational surface writes through. Nothing here is content — the filesystem stays canonical —
// so a version mismatch drops the file and starts clean rather than migrating in place. That
// costs a user their folds and tab set once, exactly as a corrupt sidecar always has.

import type { Db } from './driver'

/** A mismatch drops + recreates the file. Bump on any DDL change. */
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
