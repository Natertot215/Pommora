import { describe, it, expect, beforeEach } from 'vitest'
import { mkdtempSync, rmSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { sessionRoot, openSession, closeSession } from './session'

describe('session — open/close', () => {
  beforeEach(() => closeSession())

  it('starts empty', () => {
    expect(sessionRoot()).toBeNull()
  })

  it('opens then closes', async () => {
    await openSession('/Users/x/Nexus')
    expect(sessionRoot()).toBe('/Users/x/Nexus')
    closeSession()
    expect(sessionRoot()).toBeNull()
  })

  it('canonicalizes the root via realpath (so its lock key matches resolveUnderRoot)', async () => {
    const raw = mkdtempSync(join(tmpdir(), 'pom-sess-'))
    await openSession(raw)
    expect(sessionRoot()).toBe(realpathSync(raw))
    closeSession()
    rmSync(raw, { recursive: true, force: true })
  })
})
