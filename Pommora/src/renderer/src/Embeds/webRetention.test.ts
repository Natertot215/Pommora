import { describe, expect, it } from 'vitest'
import { createRetention } from './webRetention'

const id = (): symbol => Symbol()

describe('createRetention', () => {
  it('keeps hidden guests up to the cap without evicting', () => {
    const r = createRetention(2)
    const evicted: string[] = []
    r.hide(id(), () => evicted.push('a'))
    r.hide(id(), () => evicted.push('b'))
    expect(evicted).toEqual([])
    expect(r.hiddenCount).toBe(2)
  })

  it('evicts the least-recently-hidden guest over the cap', () => {
    const r = createRetention(2)
    const evicted: string[] = []
    r.hide(id(), () => evicted.push('a'))
    r.hide(id(), () => evicted.push('b'))
    r.hide(id(), () => evicted.push('c'))
    expect(evicted).toEqual(['a'])
    expect(r.hiddenCount).toBe(2)
  })

  it('re-hiding refreshes recency instead of double-counting', () => {
    const r = createRetention(2)
    const evicted: string[] = []
    const a = id()
    r.hide(a, () => evicted.push('a'))
    r.hide(id(), () => evicted.push('b'))
    r.hide(a, () => evicted.push('a'))
    r.hide(id(), () => evicted.push('c'))
    expect(evicted).toEqual(['b'])
  })

  it('a guest back in view leaves the hidden set and cannot be evicted', () => {
    const r = createRetention(1)
    const evicted: string[] = []
    const a = id()
    r.hide(a, () => evicted.push('a'))
    r.show(a)
    r.hide(id(), () => evicted.push('b'))
    expect(evicted).toEqual([])
    expect(r.hiddenCount).toBe(1)
  })

  it('a dropped tile frees its slot', () => {
    const r = createRetention(1)
    const evicted: string[] = []
    const a = id()
    r.hide(a, () => evicted.push('a'))
    r.drop(a)
    r.hide(id(), () => evicted.push('b'))
    expect(evicted).toEqual([])
  })
})
