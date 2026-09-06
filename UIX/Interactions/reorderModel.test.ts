import { describe, it, expect } from 'vitest'
import { nextOrder, slotInGroup, type MeasuredRow } from './reorderModel'

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

describe('slotInGroup — insertion slot over a same-group sibling', () => {
  const row = (id: string, top: number): MeasuredRow => ({
    id,
    top,
    bottom: top + 20,
    mid: top + 10,
  })
  it('drops before the hovered row when the pointer is in its top half', () => {
    expect(slotInGroup(['a', 'b', 'c'], row('b', 100), 105, 'x')).toEqual({
      beforeId: 'b',
      edge: 100,
    })
  })
  it('drops after the hovered row (before the next) when in its bottom half', () => {
    expect(slotInGroup(['a', 'b', 'c'], row('b', 100), 115, 'x')).toEqual({
      beforeId: 'c',
      edge: 120,
    })
  })
  it('appends (null) when "after" would resolve to the dragged item itself', () => {
    expect(slotInGroup(['a', 'b', 'c'], row('b', 100), 115, 'c')).toEqual({
      beforeId: null,
      edge: 120,
    })
  })
  it('crossing: that same slot fed to nextOrder is the standing order — the drop is a noop', () => {
    const order = ['a', 'b', 'c']
    expect(nextOrder(order, 'c', slotInGroup(order, row('b', 100), 115, 'c').beforeId)).toEqual(
      order,
    )
  })
})
