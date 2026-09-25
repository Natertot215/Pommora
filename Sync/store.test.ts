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
  CREATE TABLE blob (id INTEGER PRIMARY KEY, nexus_id TEXT NOT NULL, sha256 TEXT NOT NULL, key_id TEXT NOT NULL, size INTEGER NOT NULL, bytes BLOB NOT NULL, at_ms INTEGER NOT NULL, UNIQUE (nexus_id, sha256));
  CREATE TABLE item (nexus_id TEXT NOT NULL, path TEXT NOT NULL, version INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (nexus_id, path));
  CREATE TABLE change (nexus_id TEXT NOT NULL, seq INTEGER NOT NULL, kind TEXT NOT NULL, path TEXT NOT NULL, from_path TEXT, record TEXT, device TEXT NOT NULL, at_ms INTEGER NOT NULL, PRIMARY KEY (nexus_id, seq));`

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

  it('migrates a version-two store, keeping its blobs without the key id or size and marking each renamed-away path', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pommora-store-'))
    const seed = new DatabaseSync(join(dir, STORE_FILE))
    seed.exec(VERSION_TWO_DDL)
    seed.prepare('INSERT INTO meta (key, value) VALUES (?, ?)').run('schema_version', '2')
    seed
      .prepare(
        'INSERT INTO blob (nexus_id, sha256, key_id, size, bytes, at_ms) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(NEXUS, 'ab', 'k1', 3, Buffer.from('abc'), 7)
    const change = seed.prepare(
      'INSERT INTO change (nexus_id, seq, kind, path, from_path, device, at_ms) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    change.run(NEXUS, 1, 'write', 'a.md', null, 'fe1c', 1)
    change.run(NEXUS, 2, 'rename', 'b.md', 'a.md', 'fe1c', 2)
    change.run(NEXUS, 3, 'write', 'c.md', null, 'fe1c', 3)
    change.run(NEXUS, 4, 'rename', 'd.md', 'c.md', 'fe1c', 4)
    change.run(NEXUS, 5, 'write', 'c.md', null, 'fe1c', 5)
    const item = seed.prepare('INSERT INTO item (nexus_id, path, version) VALUES (?, ?, ?)')
    item.run(NEXUS, 'b.md', 2)
    item.run(NEXUS, 'd.md', 4)
    item.run(NEXUS, 'c.md', 5)
    seed.close()

    const store = openStore(dir)
    expect(store.log.readBlob(NEXUS, 'ab')).toEqual(Buffer.from('abc'))
    expect(
      store.db
        .prepare('SELECT name FROM pragma_table_info(?) ORDER BY cid')
        .all('blob')
        .map((row) => row.name),
    ).toEqual(['id', 'nexus_id', 'sha256', 'bytes', 'at_ms'])
    expect(store.db.prepare('SELECT path, version, deleted FROM item ORDER BY path').all()).toEqual(
      [
        { path: 'a.md', version: 2, deleted: 1 },
        { path: 'b.md', version: 2, deleted: 0 },
        { path: 'c.md', version: 5, deleted: 0 },
        { path: 'd.md', version: 4, deleted: 0 },
      ],
    )
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
