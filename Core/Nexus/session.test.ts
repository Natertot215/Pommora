import { describe, it, expect, beforeEach } from 'vitest'
import { rmSync } from 'node:fs'
import { realpathPosix, tempRoot } from '../Testing/hostFs'
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
    const raw = tempRoot('pom-sess-')
    await openSession(raw)
    expect(sessionRoot()).toBe(await realpathPosix(raw))
    closeSession()
    rmSync(raw, { recursive: true, force: true })
  })
})
