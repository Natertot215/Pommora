import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { openStore, STORE_FILE } from './Store/open.ts'
import { NEXUS } from './Testing/hub.ts'

const VERSION_ONE_DDL = `
  CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS device (fingerprint TEXT PRIMARY KEY, public_key TEXT NOT NULL, name TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS membership (nexus_id TEXT NOT NULL, fingerprint TEXT NOT NULL, approved INTEGER NOT NULL, PRIMARY KEY (nexus_id, fingerprint));`

const VERSION_TWO_DDL = `
  ${VERSION_ONE_DDL}
  ALTER TABLE membership ADD COLUMN role TEXT NOT NULL DEFAULT 'editor';
  ALTER TABLE device ADD COLUMN x25519 TEXT;
  CREATE TABLE blob (id INTEGER PRIMARY KEY, nexus_id TEXT NOT NULL, sha256 TEXT NOT NULL, key_id TEXT NOT NULL, size INTEGER NOT NULL, bytes BLOB NOT NULL, at_ms INTEGER NOT NULL, UNIQUE (nexus_id, sha256));`

describe('the hub store', () => {
  it('migrates a version-one store and makes its approved rows owners', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pommora-store-'))
    const seed = new DatabaseSync(join(dir, STORE_FILE))
    seed.exec(VERSION_ONE_DDL)
    seed.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('schema_version', '1')
    seed
      .prepare('INSERT INTO device (fingerprint, public_key, name) VALUES (?, ?, ?)')
      .run('fe1c', 'pk', 'Recorder')
    seed
      .prepare('INSERT INTO membership (nexus_id, fingerprint, approved) VALUES (?, ?, ?)')
      .run(NEXUS, 'fe1c', 1)
    seed
      .prepare('INSERT INTO membership (nexus_id, fingerprint, approved) VALUES (?, ?, ?)')
      .run(NEXUS, 'ab02', 0)
    seed.close()

    const store = openStore(dir)
    expect(store.roster.membership(NEXUS, 'fe1c')).toEqual({ approved: true, role: 'owner' })
    expect(store.roster.membership(NEXUS, 'ab02')).toEqual({ approved: false, role: 'editor' })
    expect(store.db.prepare('SELECT value FROM meta WHERE key = ?').get('schema_version')).toEqual({
      value: '3',
    })
    store.db.close()
  })

  it('migrates a version-two store and keeps its blobs without the key id or size', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pommora-store-'))
    const seed = new DatabaseSync(join(dir, STORE_FILE))
    seed.exec(VERSION_TWO_DDL)
    seed.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('schema_version', '2')
    seed
      .prepare(
        'INSERT INTO blob (nexus_id, sha256, key_id, size, bytes, at_ms) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(NEXUS, 'ab', 'k1', 3, Buffer.from('abc'), 7)
    seed.close()

    const store = openStore(dir)
    expect(store.log.readBlob(NEXUS, 'ab')).toEqual(Buffer.from('abc'))
    expect(
      store.db
        .prepare('SELECT name FROM pragma_table_info(?) ORDER BY cid')
        .all('blob')
        .map((row) => row.name),
    ).toEqual(['id', 'nexus_id', 'sha256', 'bytes', 'at_ms'])
    store.db.close()
  })

  it('refuses a store written by a newer hub', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pommora-store-'))
    const seed = new DatabaseSync(join(dir, STORE_FILE))
    seed.exec(VERSION_ONE_DDL)
    seed.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('schema_version', '99')
    seed.close()
    expect(() => openStore(dir)).toThrow(/schema version 99/)
  })

  it('leaves a version-one store untouched when its migration fails', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pommora-store-'))
    const seed = new DatabaseSync(join(dir, STORE_FILE))
    seed.exec(VERSION_ONE_DDL)
    seed.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('schema_version', '1')
    seed.exec('ALTER TABLE device ADD COLUMN x25519 TEXT')
    seed.close()

    expect(() => openStore(dir)).toThrow()
    const after = new DatabaseSync(join(dir, STORE_FILE))
    expect(after.prepare('SELECT value FROM meta WHERE key = ?').get('schema_version')).toEqual({
      value: '1',
    })
    expect(
      after
        .prepare('SELECT COUNT(*) AS n FROM pragma_table_info(?) WHERE name = ?')
        .get('membership', 'role'),
    ).toEqual({ n: 0 })
    after.close()
  })
})
