import { describe, it, expect, beforeEach } from 'vitest'
import { rmSync, symlinkSync } from 'node:fs'
import { tempRoot } from '../Testing/hostFs'
import {
  sessionRoot,
  openSession,
  closeSession,
  waitOn,
  waitingOpen,
  whileAdopting,
} from './session'

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

  it('a waiting open holds no session, and an open or a close ends it', async () => {
    const open = { root: '/r', path: '/p', why: 'Couldn’t read “settings.json”.' }
    await openSession('/Users/x/Nexus')
    waitOn(open)
    expect(sessionRoot()).toBeNull()
    expect(waitingOpen()).toEqual(open)
    await openSession('/Users/x/Nexus')
    expect(waitingOpen()).toBeNull()
    waitOn(open)
    closeSession()
    expect(waitingOpen()).toBeNull()
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

describe('whileAdopting', () => {
  it('runs two overlapping adoptions one after the other', async () => {
    const steps: string[] = []
    let release: () => void = () => {}
    const first = whileAdopting(async () => {
      steps.push('first:start')
      await new Promise<void>((r) => {
        release = r
      })
      steps.push('first:end')
    })
    const second = whileAdopting(async () => {
      steps.push('second:start')
    })
    await new Promise((r) => setTimeout(r, 0))
    release()
    await Promise.all([first, second])
    expect(steps).toEqual(['first:start', 'first:end', 'second:start'])
  })
})
