import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { chmod, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openSessionDb, closeSessionDb } from '../sessionDb'
import { readScope, writeKey, replaceScope, readValue, writeValue } from './localState'

let root: string
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-local-state-'))
  openSessionDb(root)
})
afterEach(async () => {
  closeSessionDb()
  await rm(root, { recursive: true, force: true })
})

describe('keyed scopes', () => {
  it('round-trips a value and keeps scopes apart', () => {
    writeKey('folds', 'page-1', ['intro', 'body'])
    writeKey('headingCols', 'page-1', [0, 2])
    expect(readScope<string[]>('folds')).toEqual({ 'page-1': ['intro', 'body'] })
    expect(readScope<number[]>('headingCols')).toEqual({ 'page-1': [0, 2] })
  })

  it('an empty scope reads as {}', () => {
    expect(readScope('viewOrder')).toEqual({})
  })

  it('null clears the key rather than storing an empty container', () => {
    writeKey('activeView', 'c1', 'v1')
    writeKey('activeView', 'c2', 'v2')
    writeKey('activeView', 'c1', null)
    expect(readScope<string>('activeView')).toEqual({ c2: 'v2' })
  })

  it('rewriting a key replaces it in place', () => {
    writeKey('viewOrder', 'v1', ['a', 'b'])
    writeKey('viewOrder', 'v1', ['b', 'a'])
    expect(readScope<string[]>('viewOrder')).toEqual({ v1: ['b', 'a'] })
  })
})

describe('replaceScope', () => {
  it('swaps the whole scope, dropping absent keys', () => {
    writeKey('linkTitle', 'https://a', 'A')
    writeKey('linkTitle', 'https://b', 'B')
    replaceScope('linkTitle', { 'https://c': 'C' })
    expect(readScope<string>('linkTitle')).toEqual({ 'https://c': 'C' })
  })

  it('leaves sibling scopes untouched', () => {
    writeKey('folds', 'p1', ['x'])
    replaceScope('linkTitle', { 'https://a': 'A' })
    expect(readScope<string[]>('folds')).toEqual({ p1: ['x'] })
  })
})

describe('singleton scopes', () => {
  it('reads null before anything is written', () => {
    expect(readValue('tabs')).toBeNull()
  })

  it('round-trips a whole value and overwrites in place', () => {
    writeValue('tabs', { tabs: [{ id: 't1' }], activeTabId: 't1' })
    writeValue('tabs', { tabs: [{ id: 't2' }], activeTabId: 't2' })
    expect(readValue('tabs')).toEqual({ tabs: [{ id: 't2' }], activeTabId: 't2' })
  })

  it('a singleton does not collide with the same scope used as a map', () => {
    writeValue('recents', [{ kind: 'page', id: 'p1' }])
    expect(readValue<unknown[]>('recents')).toHaveLength(1)
  })
})

describe('no database open', () => {
  it('reads degrade to empty and writes no-op instead of throwing', () => {
    closeSessionDb()
    expect(readScope('folds')).toEqual({})
    expect(readValue('tabs')).toBeNull()
    expect(() => writeKey('folds', 'p1', ['x'])).not.toThrow()
    expect(() => writeValue('tabs', {})).not.toThrow()
    expect(() => replaceScope('linkTitle', { a: 'b' })).not.toThrow()
  })

  it('writes report failure so a caller never acknowledges a lost write', () => {
    expect(writeKey('folds', 'p1', ['x'])).toBe(true)
    expect(writeValue('tabs', {})).toBe(true)
    closeSessionDb()
    expect(writeKey('folds', 'p1', ['x'])).toBe(false)
    expect(writeValue('tabs', {})).toBe(false)
  })
})

describe('openSessionDb', () => {
  it('never throws — an unwritable nexus opens without persistence, not with a failure', async () => {
    closeSessionDb()
    const ro = await mkdtemp(join(tmpdir(), 'pom-readonly-'))
    await chmod(ro, 0o555)
    try {
      expect(() => openSessionDb(ro)).not.toThrow()
      expect(readScope('folds')).toEqual({})
      expect(writeKey('folds', 'p1', ['x'])).toBe(false)
    } finally {
      await chmod(ro, 0o755)
      await rm(ro, { recursive: true, force: true })
    }
  })
})
