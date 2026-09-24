import { describe, it, expect, beforeEach } from 'vitest'
import { rmSync, symlinkSync } from 'node:fs'
import { tempRoot } from '../Testing/hostFs'
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
    const real = tempRoot('pom-sess-')
    const raw = `${real}-link`
    symlinkSync(real, raw, 'junction')
    await openSession(raw)
    expect(sessionRoot()).toBe(real)
    closeSession()
    rmSync(raw)
    rmSync(real, { recursive: true, force: true })
  })
})
