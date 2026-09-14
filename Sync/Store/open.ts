import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { rosterStore } from './roster.ts'

export const STORE_FILE = 'sync.db'

const SCHEMA_VERSION = 2

const DDL = `
  CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS device (fingerprint TEXT PRIMARY KEY, public_key TEXT NOT NULL, name TEXT NOT NULL, x25519 TEXT);
  CREATE TABLE IF NOT EXISTS membership (nexus_id TEXT NOT NULL, fingerprint TEXT NOT NULL, approved INTEGER NOT NULL, role TEXT NOT NULL DEFAULT 'editor', PRIMARY KEY (nexus_id, fingerprint));
  CREATE TABLE IF NOT EXISTS nexus (nexus_id TEXT PRIMARY KEY, version INTEGER NOT NULL, protocol INTEGER NOT NULL, kdf TEXT NOT NULL, history_days INTEGER NOT NULL, seq INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS ring (nexus_id TEXT NOT NULL, key_id TEXT NOT NULL, holder TEXT NOT NULL, wrapped BLOB NOT NULL, created_ms INTEGER NOT NULL, PRIMARY KEY (nexus_id, key_id, holder));
  CREATE TABLE IF NOT EXISTS item (nexus_id TEXT NOT NULL, path TEXT NOT NULL, version INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (nexus_id, path));
  CREATE TABLE IF NOT EXISTS change (nexus_id TEXT NOT NULL, seq INTEGER NOT NULL, kind TEXT NOT NULL, path TEXT NOT NULL, from_path TEXT, record TEXT, device TEXT NOT NULL, at_ms INTEGER NOT NULL, PRIMARY KEY (nexus_id, seq));
  CREATE TABLE IF NOT EXISTS blob (id INTEGER PRIMARY KEY, nexus_id TEXT NOT NULL, sha256 TEXT NOT NULL, key_id TEXT NOT NULL, size INTEGER NOT NULL, bytes BLOB NOT NULL, at_ms INTEGER NOT NULL, UNIQUE (nexus_id, sha256));
  CREATE TABLE IF NOT EXISTS capture (nexus_id TEXT NOT NULL, path TEXT NOT NULL, at_ms INTEGER NOT NULL, record TEXT NOT NULL, PRIMARY KEY (nexus_id, path, at_ms));
  CREATE TABLE IF NOT EXISTS request (nexus_id TEXT NOT NULL, request_id TEXT NOT NULL, reply TEXT NOT NULL, at_ms INTEGER NOT NULL, PRIMARY KEY (nexus_id, request_id));`

const MIGRATIONS: Record<number, string[]> = {
  2: [
    "ALTER TABLE membership ADD COLUMN role TEXT NOT NULL DEFAULT 'editor'",
    "UPDATE membership SET role = 'owner' WHERE approved = 1",
    'ALTER TABLE device ADD COLUMN x25519 TEXT',
  ],
}

export interface Store {
  db: DatabaseSync
  roster: ReturnType<typeof rosterStore>
}

function migrate(db: DatabaseSync): void {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get('schema_version') as
    | { value: string }
    | undefined
  const from = row ? Number(row.value) : SCHEMA_VERSION
  if (from < SCHEMA_VERSION) {
    db.exec('BEGIN')
    for (let version = from + 1; version <= SCHEMA_VERSION; version++) {
      for (const statement of MIGRATIONS[version] ?? []) db.exec(statement)
    }
    db.exec('COMMIT')
  }
  db.prepare(
    'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  ).run('schema_version', String(SCHEMA_VERSION))
}

export function openStore(dir: string): Store {
  mkdirSync(dir, { recursive: true })
  const db = new DatabaseSync(join(dir, STORE_FILE), { timeout: 5000 })
  db.exec('PRAGMA journal_mode = WAL')
  db.exec(DDL)
  migrate(db)
  return { db, roster: rosterStore(db) }
}
