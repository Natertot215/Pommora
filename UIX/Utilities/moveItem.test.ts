import { describe, expect, it } from 'vitest'
import { fullOrderIndex, moveBefore, nextOrder, resolveRowOrder } from './moveItem'

const items = (...ids: string[]) => ids.map((id) => ({ id }))
const idOf = (item: { id: string }): string => item.id

describe('moveBefore', () => {
  it('moves an item before another key, or to the end on null', () => {
    expect(moveBefore(items('a', 'b', 'c'), idOf, 'a', 'c')).toEqual(items('b', 'a', 'c'))
    expect(moveBefore(items('a', 'b', 'c'), idOf, 'c', 'a')).toEqual(items('c', 'a', 'b'))
    expect(moveBefore(items('a', 'b', 'c'), idOf, 'a', null)).toEqual(items('b', 'c', 'a'))
  })

  it('returns null on a no-move, an absent key, or an unknown before-key', () => {
    const list = items('a', 'b', 'c')
    expect(moveBefore(list, idOf, 'a', 'a')).toBeNull()
    expect(moveBefore(list, idOf, 'a', 'b')).toBeNull()
    expect(moveBefore(list, idOf, 'c', null)).toBeNull()
    expect(moveBefore(list, idOf, 'z', 'a')).toBeNull()
    expect(moveBefore(list, idOf, 'a', 'z')).toBeNull()
  })
})

describe('nextOrder', () => {
  it('reorders within a group (to front / further back)', () => {
    expect(nextOrder(['a', 'b', 'c'], 'c', 'a')).toEqual(['c', 'a', 'b'])
    expect(nextOrder(['a', 'b', 'c'], 'a', 'c')).toEqual(['b', 'a', 'c'])
  })
  it('appends when beforeId is null', () => {
    expect(nextOrder(['a', 'b', 'c'], 'a', null)).toEqual(['b', 'c', 'a'])
  })
  it('inserts an item arriving from elsewhere', () => {
    expect(nextOrder(['x', 'y'], 'd', 'y')).toEqual(['x', 'd', 'y'])
    expect(nextOrder(['x', 'y'], 'd', null)).toEqual(['x', 'y', 'd'])
  })
  it('falls back to append on an unknown beforeId or empty group', () => {
    expect(nextOrder(['a', 'b'], 'c', 'z')).toEqual(['a', 'b', 'c'])
    expect(nextOrder([], 'd', null)).toEqual(['d'])
  })
})

describe('resolveRowOrder', () => {
  const rows = [{ k: 'a' }, { k: 'b' }, { k: 'c' }]
  const keyOf = (i: { k: string }): string => i.k

  it('puts the listed first in listed order and the unlisted after in arrival order', () => {
    expect(resolveRowOrder(rows, keyOf, ['c', 'a']).map(keyOf)).toEqual(['c', 'a', 'b'])
  })

  it('ignores a listed key no item answers', () => {
    expect(resolveRowOrder(rows, keyOf, ['z', 'b']).map(keyOf)).toEqual(['b', 'a', 'c'])
  })

  it('is identity over an empty or absent list', () => {
    expect(resolveRowOrder(rows, keyOf, []).map(keyOf)).toEqual(['a', 'b', 'c'])
    expect(resolveRowOrder(rows, keyOf).map(keyOf)).toEqual(['a', 'b', 'c'])
  })
})

describe('fullOrderIndex', () => {
  // Full order [A,B,C,D,E]; A and B are hidden from the list; the visible rows are [C,D,E].
  const order = ['A', 'B', 'C', 'D', 'E']
  const visible = ['C', 'D', 'E']

  it('dropping E at the visible top lands just before C in the full order, never ahead of the hidden ids', () => {
    expect(fullOrderIndex(order, visible, 'E', 0)).toBe(2)
  })

  it('dropping E between visible C and D lands between them in the full order', () => {
    expect(fullOrderIndex(order, visible, 'E', 1)).toBe(3)
  })

  it('dropping C past the last visible row appends after E', () => {
    expect(fullOrderIndex(order, visible, 'C', 2)).toBe(4)
  })

  it('with no visible rows a drop appends to the full order', () => {
    expect(fullOrderIndex(['A', 'B'], [], 'X', 0)).toBe(2)
  })
})
