import { describe, it, expect } from 'vitest'
import { buildLanes, laneAt, laneSlot, rank, type Row, rowSlot, walksTo } from './reorderModel'

const row = (id: string, top: number): Row => ({
  id,
  top,
  bottom: top + 20,
  mid: top + 10,
  left: 0,
  right: 100,
})

describe('rank', () => {
  it('counts values at or below y, so a pointer exactly on a value goes after it', () => {
    expect(rank([10, 20, 30], 5)).toBe(0)
    expect(rank([10, 20, 30], 20)).toBe(2)
    expect(rank([10, 20, 30], 99)).toBe(3)
    expect(rank([], 1)).toBe(0)
  })
})

describe('lanes — where a dragged row lands across groups', () => {
  const rows = [row('a', 0), row('b', 24), row('c', 48), row('d', 88), row('e', 112)]
  const laneOf = (id: string): string => (id < 'd' ? 'todo' : 'done')
  const slotAt = (id: string, y: number) => {
    const lanes = buildLanes(rows, id, laneOf)
    return rowSlot(laneAt(lanes, y), y)
  }

  it('lands cross-group on the row edge and at the end', () => {
    expect(slotAt('a', 115)).toEqual({ lane: 'done', index: 1, before: 'e', edge: 112 })
    expect(slotAt('a', 128)).toEqual({ lane: 'done', index: 2, before: null, edge: 132 })
  })

  it('splits the space between groups at its midpoint', () => {
    expect(slotAt('d', 75)).toEqual({ lane: 'todo', index: 3, before: null, edge: 68 })
    expect(slotAt('c', 80)).toEqual({ lane: 'done', index: 0, before: 'd', edge: 88 })
  })

  it('counts a same-group drop past the origin with the dragged row removed', () => {
    expect(slotAt('a', 40)).toEqual({ lane: 'todo', index: 1, before: 'c', edge: 48 })
    expect(slotAt('a', 60)).toEqual({ lane: 'todo', index: 2, before: null, edge: 68 })
    expect(slotAt('c', 5)).toEqual({ lane: 'todo', index: 0, before: 'a', edge: 0 })
    expect(slotAt('c', 10)).toEqual({ lane: 'todo', index: 1, before: 'b', edge: 24 })
  })

  it('resolves a drop that would not move to null', () => {
    expect(slotAt('b', 28)).toBeNull()
    expect(slotAt('b', 55)).toBeNull()
  })

  it('takes a drop into an empty group at its box top', () => {
    const boxes = new Map([['done', { ...row('done', 88), bottom: 108 }]])
    const lanes = buildLanes([row('a', 0), row('b', 24), row('c', 48)], 'a', laneOf, boxes)
    expect(rowSlot(laneAt(lanes, 95), 95)).toEqual({
      lane: 'done',
      index: 0,
      before: null,
      edge: 88,
    })
  })

  it('sorts lanes by top whatever order their keys arrive in', () => {
    const lanes = buildLanes(rows, 'a', (id) => (id < 'd' ? 'z' : 'y'))
    expect(lanes.list.map((lane) => lane.key)).toEqual(['z', 'y'])
  })

  it('spans a lane with no box across its rows, the dragged one included', () => {
    const lanes = buildLanes(rows, 'a', laneOf)
    expect(lanes.list[0]).toMatchObject({ key: 'todo', top: 0, bottom: 68 })
  })

  it('joins a row whose lane is undefined to no lane', () => {
    const lanes = buildLanes(rows, 'a', (id) => (id === 'e' ? undefined : laneOf(id)))
    expect(lanes.list[1].slots.map((s) => s.before)).toEqual(['d', null])
  })

  it('returns the identical slot object for two points in one gap', () => {
    const lanes = buildLanes(rows, 'a', laneOf)
    const lane = laneAt(lanes, 40)
    expect(rowSlot(lane, 40)).toBe(rowSlot(lane, 44))
  })
})

describe('laneSlot', () => {
  const rows = [row('a', 0), row('b', 24), row('d', 88), row('e', 112)]
  const lanes = buildLanes(rows, 'a', (id) => (id < 'd' ? 'todo' : 'done'))

  it('resolves null outside the home lane unless across', () => {
    expect(laneSlot(lanes, 115, false)).toBeNull()
    expect(laneSlot(lanes, 115, true)).toMatchObject({ lane: 'done', before: 'e' })
    expect(laneSlot(lanes, 40, false)).toMatchObject({ lane: 'todo', before: null })
  })
})

describe('walksTo', () => {
  const parents: Record<string, string | undefined> = { c: 'b', b: 'a' }
  it('walks a parent reader up to an ancestor', () => {
    expect(walksTo('c', 'a', (id) => parents[id])).toBe(true)
    expect(walksTo('a', 'c', (id) => parents[id])).toBe(false)
    expect(walksTo('c', 'c', (id) => parents[id])).toBe(true)
  })
})
