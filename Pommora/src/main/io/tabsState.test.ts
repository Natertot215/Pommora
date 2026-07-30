import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { StoredTabSet } from '@shared/types'
import { openSessionDb, closeSessionDb } from '../sessionDb'
import { writeValue } from '../db/localState'
import { readTabsState, sanitizeTabSet, writeTabsState } from './tabsState'

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-tabsstate-'))
  openSessionDb(root)
})
afterEach(async () => {
  closeSessionDb()
  await rm(root, { recursive: true, force: true })
})

const set = (id: string): StoredTabSet => ({
  tabs: [
    {
      id,
      target: { kind: 'page', id: 'p1' },
      navStack: [{ kind: 'page', id: 'p1' }],
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

  it('passes a stored index through raw — the restore hydrator owns lockstep, not the reader', () => {
    const a = { kind: 'page', id: 'p1' } as const
    const b = { kind: 'page', id: 'p2' } as const
    writeValue('tabs', {
      tabs: [{ id: 't1', target: a, navStack: [a, b], navIndex: 1 }],
      activeTabId: 't1',
    })
    expect(readTabsState()?.tabs[0].navIndex).toBe(1)
  })

  it('a ref carrying display fields strips to bare identity — no path, no title survives the row', () => {
    const a = { kind: 'page', id: 'p1' } as const
    writeValue('tabs', {
      tabs: [
        {
          id: 't1',
          target: { ...a, path: 'stale.md', title: 'Stale' },
          navStack: [{ ...a, path: 'stale.md' }],
          navIndex: 0,
        },
      ],
      activeTabId: 't1',
    })
    const tab = readTabsState()?.tabs[0]
    expect(tab?.target).toEqual(a)
    expect(tab?.navStack).toEqual([a])
  })

  it('drops a tab with no target or no history rather than crashing the restore', () => {
    const a = { kind: 'page', id: 'p1' } as const
    writeValue('tabs', {
      tabs: [
        { id: 'bad' },
        { id: 'alsoBad', target: { kind: 'nope' } },
        { id: 'ok', target: a, navStack: [a], navIndex: 0 },
      ],
      activeTabId: 'ok',
    })
    expect(readTabsState()?.tabs.map((t) => t.id)).toEqual(['ok'])
  })

  it('a stackless tab reads with an empty stack (the hydrator seeds a single entry)', () => {
    const a = { kind: 'page', id: 'p1' } as const
    writeValue('tabs', { tabs: [{ id: 't1', target: a }], activeTabId: 't1' })
    expect(readTabsState()?.tabs[0].navStack).toEqual([])
  })

  it('dedupes ids — closeTab drops by id, so a shared one would close two tabs', () => {
    const a = { kind: 'page', id: 'p1' } as const
    writeValue('tabs', {
      tabs: [
        { id: 'dup', target: a, navStack: [a], navIndex: 0 },
        { id: 'dup', target: a, navStack: [a], navIndex: 0 },
      ],
      activeTabId: 'dup',
    })
    expect(readTabsState()?.tabs).toHaveLength(1)
  })

  it('reads null with no database open', () => {
    writeTabsState(set('t1'))
    closeSessionDb()
    expect(readTabsState()).toBeNull()
  })
})

describe('sanitizeTabSet', () => {
  it('refuses a payload that is not a tab set', () => {
    expect(sanitizeTabSet(null)).toBeNull()
    expect(sanitizeTabSet('tabs')).toBeNull()
    expect(sanitizeTabSet({ activeTabId: 't1' })).toBeNull()
  })
})
