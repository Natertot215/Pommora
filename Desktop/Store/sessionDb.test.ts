import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { chmodSync, existsSync, readdirSync, rmSync } from 'node:fs'
import { join } from '@pommora/core/Paths/posix'
import { tempRoot, noModeBits } from '@pommora/core/Testing/hostFs'
import { keyValueStore, snapshotStore } from '@pommora/core/Platform/stores'
import { closeSessionDb, openSessionDb } from './sessionDb'
import { VERSIONS_FILENAME } from './versionsDb'
import { DB_FILENAME } from './open'

describe('sessionDb', () => {
  let root: string
  let storage: string
  let dir: string
  beforeEach(() => {
    root = tempRoot('pom-sessdb-')
    storage = tempRoot('pom-sessdb-storage-')
    dir = join(storage, 'Nexuses', 'nx')
  })
  afterEach(() => {
    closeSessionDb()
    rmSync(root, { recursive: true, force: true })
    rmSync(storage, { recursive: true, force: true })
  })

  it('opens both stores in the store directory and closes both', () => {
    openSessionDb(dir, root)
    expect(keyValueStore()).not.toBeNull()
    expect(snapshotStore()).not.toBeNull()
    expect(existsSync(join(dir, DB_FILENAME))).toBe(true)
    expect(existsSync(join(dir, VERSIONS_FILENAME))).toBe(true)
    closeSessionDb()
    expect(keyValueStore()).toBeNull()
    expect(snapshotStore()).toBeNull()
  })

  it('opens nothing without a store directory', () => {
    openSessionDb(null, root)
    expect(keyValueStore()).toBeNull()
    expect(readdirSync(root)).toEqual([])
  })

  it.skipIf(noModeBits)('never throws on read-only storage, opening without persistence', () => {
    chmodSync(storage, 0o555)
    try {
      expect(() => openSessionDb(dir, root)).not.toThrow()
      expect(keyValueStore()).toBeNull()
    } finally {
      chmodSync(storage, 0o755)
    }
  })
})
