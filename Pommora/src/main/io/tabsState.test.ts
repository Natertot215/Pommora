import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { TabSet } from '@shared/types'
import { openSessionDb, closeSessionDb } from '../sessionDb'
import { readTabsState, writeTabsState } from './tabsState'

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-tabsstate-'))
  openSessionDb(root)
})
afterEach(async () => {
  closeSessionDb()
  await rm(root, { recursive: true, force: true })
})

const set = (id: string): TabSet => ({
  tabs: [
    {
      id,
      target: { kind: 'page', id: 'p1', path: 'a.md' },
      navStack: [{ kind: 'page', id: 'p1', path: 'a.md' }],
      navIndex: 0,
    },
  ],
  activeTabId: id,
})

describe('readTabsState', () => {
  it('reads null before anything is written (the store seeds a fresh NavView)', () => {
    expect(readTabsState()).toBeNull()
  })

  it('round-trips the set, its history and the active pointer', () => {
    writeTabsState(set('t1'))
    expect(readTabsState()).toEqual(set('t1'))
  })

  it('a rewrite replaces the row rather than accumulating', () => {
    writeTabsState(set('t1'))
    writeTabsState(set('t2'))
    expect(readTabsState()).toEqual(set('t2'))
  })

  it('reads null with no database open', () => {
    writeTabsState(set('t1'))
    closeSessionDb()
    expect(readTabsState()).toBeNull()
  })
})
