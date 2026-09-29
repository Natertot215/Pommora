import { describe, expect, it } from 'vitest'
import { moveBefore, nextOrder } from './moveItem'

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
