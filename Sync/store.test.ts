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
      value: '2',
    })
    store.db.close()
  })
})
