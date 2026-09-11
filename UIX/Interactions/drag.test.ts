import { describe, expect, it } from 'vitest'
import { reorder } from './drag'

const items = (...ids: string[]) => ids.map((id) => ({ id }))

describe('reorder', () => {
  it('moves the active item into the over slot', () => {
    expect(reorder(items('a', 'b', 'c'), 'a', 'c')).toEqual(items('b', 'c', 'a'))
    expect(reorder(items('a', 'b', 'c'), 'c', 'a')).toEqual(items('c', 'a', 'b'))
  })
  it('returns the input on a no-op (same id, or an absent id)', () => {
    const list = items('a', 'b')
    expect(reorder(list, 'a', 'a')).toBe(list)
    expect(reorder(list, 'z', 'a')).toBe(list)
  })
})
