import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { closeSessionDb, openSessionDb, sessionDb, sessionVersionsDb } from './sessionDb'
import { VERSIONS_FILENAME } from './Database/versionsDb'
import { DB_FILENAME } from './Database/open'

describe('sessionDb', () => {
  let root: string
  afterEach(() => {
    closeSessionDb()
    rmSync(root, { recursive: true, force: true })
  })

  it('opens both stores for a root and closes both', () => {
    root = mkdtempSync(join(tmpdir(), 'pom-sessdb-'))
    openSessionDb(root)
    expect(sessionDb()).not.toBeNull()
    expect(sessionVersionsDb()).not.toBeNull()
    expect(existsSync(join(root, '.nexus', DB_FILENAME))).toBe(true)
    expect(existsSync(join(root, '.nexus', VERSIONS_FILENAME))).toBe(true)
    closeSessionDb()
    expect(sessionDb()).toBeNull()
    expect(sessionVersionsDb()).toBeNull()
  })
})
