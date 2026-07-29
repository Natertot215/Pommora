import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openNexusDb, DB_FILENAME } from './open'
import { SCHEMA_VERSION, readSchemaVersion } from './schema'
import type { Db } from './driver'

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-db-open-'))
})
afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

const seed = (db: Db, key: string): void => {
  db.prepare(
    "INSERT OR REPLACE INTO local_state (scope, key, value) VALUES ('folds', ?, '[]')",
  ).run(key)
}
const keys = (db: Db): string[] =>
  (db.prepare('SELECT key FROM local_state').all() as { key: string }[]).map((r) => r.key)

describe('openNexusDb', () => {
  it('creates the file, applies the schema, and stamps the version', () => {
    const db = openNexusDb(root)
    expect(db).not.toBeNull()
    if (!db) return
    expect(existsSync(join(root, '.nexus', DB_FILENAME))).toBe(true)
    expect(readSchemaVersion(db)).toBe(SCHEMA_VERSION)
    db.close()
  })

  it('reuses an existing file at the current version, data intact', () => {
    const first = openNexusDb(root)
    expect(first).not.toBeNull()
    if (!first) return
    seed(first, 'p1')
    first.close()

    const second = openNexusDb(root)
    expect(second && keys(second)).toEqual(['p1'])
    second?.close()
  })

  it('drops and recreates on a version mismatch', () => {
    const first = openNexusDb(root)
    expect(first).not.toBeNull()
    if (!first) return
    seed(first, 'stale')
    first.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', '0')").run()
    first.close()

    const second = openNexusDb(root)
    expect(second && keys(second)).toEqual([])
    expect(second && readSchemaVersion(second)).toBe(SCHEMA_VERSION)
    second?.close()
  })

  it('recreates when the version was never stamped', () => {
    const first = openNexusDb(root)
    expect(first).not.toBeNull()
    if (!first) return
    seed(first, 'half')
    first.prepare("DELETE FROM meta WHERE key = 'schema_version'").run()
    first.close()

    const second = openNexusDb(root)
    expect(second && keys(second)).toEqual([])
    second?.close()
  })

  it('leaves a file it could not open intact — only a version mismatch earns the drop', async () => {
    const dbPath = join(root, '.nexus', DB_FILENAME)
    await mkdir(join(root, '.nexus'), { recursive: true })
    await writeFile(dbPath, 'not a database', 'utf8')
    const db = openNexusDb(root)
    expect(db).toBeNull() // the session runs without persistence
    expect(await readFile(dbPath, 'utf8')).toBe('not a database') // byte-identical
  })
})
