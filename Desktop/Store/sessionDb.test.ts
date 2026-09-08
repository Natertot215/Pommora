import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { chmodSync, mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { keyValueStore } from '@pommora/core/Platform/stores'
import { closeSessionDb, openSessionDb, sessionDb, sessionVersionsDb } from './sessionDb'
import { VERSIONS_FILENAME } from './versionsDb'
import { DB_FILENAME } from './open'

describe('sessionDb', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'pom-sessdb-'))
  })
  afterEach(() => {
    closeSessionDb()
    rmSync(root, { recursive: true, force: true })
  })

  it('opens both stores for a root and closes both', () => {
    openSessionDb(root)
    expect(sessionDb()).not.toBeNull()
    expect(sessionVersionsDb()).not.toBeNull()
    expect(existsSync(join(root, '.nexus', DB_FILENAME))).toBe(true)
    expect(existsSync(join(root, '.nexus', VERSIONS_FILENAME))).toBe(true)
    closeSessionDb()
    expect(sessionDb()).toBeNull()
    expect(sessionVersionsDb()).toBeNull()
  })

  it('never throws on read-only media, opening without persistence', () => {
    const ro = mkdtempSync(join(tmpdir(), 'pom-readonly-'))
    chmodSync(ro, 0o555)
    try {
      expect(() => openSessionDb(ro)).not.toThrow()
      expect(sessionDb()).toBeNull()
      expect(keyValueStore()).toBeNull()
    } finally {
      chmodSync(ro, 0o755)
      rmSync(ro, { recursive: true, force: true })
    }
  })
})
