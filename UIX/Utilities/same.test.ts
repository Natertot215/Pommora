import { describe, expect, it } from 'vitest'
import { sameItems, sameSet } from './same'

describe('sameItems', () => {
  it('matches item by item, in order', () => {
    expect(sameItems(['a', 'b'], ['a', 'b'])).toBe(true)
    expect(sameItems(['a', 'b'], ['b', 'a'])).toBe(false)
    expect(sameItems(['a'], ['a', 'b'])).toBe(false)
  })

  it('reads typed arrays', () => {
    expect(sameItems(new Uint8Array([1, 2]), new Uint8Array([1, 2]))).toBe(true)
    expect(sameItems(new Uint8Array([1, 2]), new Uint8Array([1, 3]))).toBe(false)
  })
})

describe('sameSet', () => {
  it('ignores order and counts size', () => {
    expect(sameSet(new Set(['a', 'b']), new Set(['b', 'a']))).toBe(true)
    expect(sameSet(new Set(['a']), new Set(['a', 'b']))).toBe(false)
    expect(sameSet(new Set(['a', 'c']), new Set(['a', 'b']))).toBe(false)
  })
})
