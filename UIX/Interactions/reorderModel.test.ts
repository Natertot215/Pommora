import { describe, it, expect } from 'vitest'
import {
  type MeasuredGroup,
  type MeasuredRow,
  nextOrder,
  resolveGroupedSlot,
  slotInGroup,
} from './reorderModel'

const row = (id: string, top: number): MeasuredRow => ({
  id,
  top,
  bottom: top + 20,
  mid: top + 10,
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

describe('slotInGroup — insertion slot over a same-group sibling', () => {
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

describe('resolveGroupedSlot — where a dragged row lands across groups', () => {
  const groups: MeasuredGroup[] = [
    { id: 'todo', top: 0, bottom: 68, rows: [row('a', 0), row('b', 24), row('c', 48)] },
    { id: 'done', top: 88, bottom: 132, rows: [row('d', 88), row('e', 112)] },
  ]

  it('lands cross-group mid-gap and at the end, with no same-group shift', () => {
    expect(resolveGroupedSlot('a', 115, groups)).toEqual({ groupId: 'done', top: 22, to: 1 })
    expect(resolveGroupedSlot('a', 128, groups)).toEqual({ groupId: 'done', top: 44, to: 2 })
  })

  it('splits the space between groups at its midpoint', () => {
    expect(resolveGroupedSlot('d', 75, groups)).toEqual({ groupId: 'todo', top: 68, to: 3 })
    expect(resolveGroupedSlot('c', 80, groups)).toEqual({ groupId: 'done', top: 0, to: 0 })
  })

  it('counts a same-group drop past the origin with the dragged row removed', () => {
    expect(resolveGroupedSlot('a', 40, groups)).toEqual({ groupId: 'todo', top: 46, to: 1 })
    expect(resolveGroupedSlot('a', 60, groups)).toEqual({ groupId: 'todo', top: 68, to: 2 })
    expect(resolveGroupedSlot('c', 5, groups)).toEqual({ groupId: 'todo', top: 0, to: 0 })
    expect(resolveGroupedSlot('c', 10, groups)).toEqual({ groupId: 'todo', top: 22, to: 1 })
  })

  it('resolves a drop that would not move, or a row it never measured, to null', () => {
    expect(resolveGroupedSlot('b', 28, groups)).toBeNull()
    expect(resolveGroupedSlot('b', 55, groups)).toBeNull()
    expect(resolveGroupedSlot('gone', 28, groups)).toBeNull()
  })

  it('an empty group takes the drop at its top', () => {
    const emptied: MeasuredGroup[] = [groups[0], { id: 'done', top: 88, bottom: 108, rows: [] }]
    expect(resolveGroupedSlot('a', 95, emptied)).toEqual({ groupId: 'done', top: 0, to: 0 })
  })
})
