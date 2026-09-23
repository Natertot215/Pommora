import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { installStores, NO_STORES } from './stores'
import { memoryStores } from '../Testing/memoryStores'
import { readScope, writeKey, readValue, writeValue } from './localState'

beforeEach(() => {
  installStores(memoryStores().stores)
})
afterEach(() => {
  installStores(NO_STORES)
})

describe('keyed scopes', () => {
  it('round-trips a value and keeps scopes apart', () => {
    writeKey('folds', 'page-1', ['intro', 'body'])
    writeKey('headingCols', 'page-1', [0, 2])
    expect(readScope<string[]>('folds')).toEqual({ 'page-1': ['intro', 'body'] })
    expect(readScope<number[]>('headingCols')).toEqual({ 'page-1': [0, 2] })
  })

  it('an empty scope reads as {}', () => {
    expect(readScope('embedZooms')).toEqual({})
  })

  it('a page’s folds round-trip and are overwritten in place', () => {
    writeKey('folds', 'page-1', ['intro', 'outro'])
    writeKey('folds', 'page-1', ['outro'])
    expect(readScope<string[]>('folds')).toEqual({ 'page-1': ['outro'] })
  })

  it('null clears the key rather than storing an empty container', () => {
    writeKey('citations', 'page-1', true)
    writeKey('citations', 'page-2', false)
    writeKey('citations', 'page-1', null)
    expect(readScope<boolean>('citations')).toEqual({ 'page-2': false })
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
    installStores(NO_STORES)
    expect(readScope('folds')).toEqual({})
    expect(readValue('tabs')).toBeNull()
    expect(() => writeKey('folds', 'p1', ['x'])).not.toThrow()
    expect(() => writeValue('tabs', {})).not.toThrow()
  })

  it('writes report failure so a caller never acknowledges a lost write', () => {
    expect(writeKey('folds', 'p1', ['x'])).toBe(true)
    expect(writeValue('tabs', {})).toBe(true)
    installStores(NO_STORES)
    expect(writeKey('folds', 'p1', ['x'])).toBe(false)
    expect(writeValue('tabs', {})).toBe(false)
  })
})
