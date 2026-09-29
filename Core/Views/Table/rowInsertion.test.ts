import { describe, expect, it } from 'vitest'
import { type Geometry, laneSlot, type Row } from '@pommora/uix/Interactions/reorderModel'
import { DROP_LINE_INSET } from '@pommora/uix/Interactions/shared'
import { ROW_END, rowLine, rowSnap } from './rowInsertion'

const row = (id: string, top: number, left = 0, right = 200): Row => ({
  id,
  top,
  bottom: top + 20,
  mid: top + 10,
  left,
  right,
})
const geo = (rows: Row[], groups: Row[] = []): Geometry => ({
  rows,
  groups: new Map(groups.map((r) => [r.id, r])),
  bottom: 200,
})
const bands = new Map([
  ['r1', 'a'],
  ['r2', 'a'],
  ['r3', 'a'],
])
const rows = [row('r1', 0), row('r2', 20), row('r3', 40)]

describe('rowInsertion', () => {
  it('a drop below the row the dragged one already follows is a no-op, not a slot above it', () => {
    const snap = rowSnap(geo(rows), 'r3', bands)!
    expect(laneSlot(snap, 35, false)).toBeNull()
    expect(laneSlot(snap, 55, false)).toBeNull()
  })

  it("a band's first row released over itself stays put", () => {
    const snap = rowSnap(geo(rows), 'r1', bands)!
    expect(laneSlot(snap, 5, false)).toBeNull()
    expect(laneSlot(snap, 35, false)).toMatchObject({ lane: 'a', index: 1, before: 'r3' })
  })

  it("the line runs from the dragged row's left to the end filler, inset both sides", () => {
    const filler = row(ROW_END, 0, 180, 200)
    const snap = rowSnap(geo([row('r1', 0, 10, 180), ...rows.slice(1)], [filler]), 'r1', bands)!
    const slot = laneSlot(snap, 35, false)!
    expect(rowLine(slot, snap)).toEqual({
      top: slot.edge,
      left: 10 + DROP_LINE_INSET,
      width: 180 - DROP_LINE_INSET - (10 + DROP_LINE_INSET),
      right: 'auto',
    })
  })

  it('measures nothing for a row it never saw', () => {
    expect(rowSnap(geo(rows), 'gone', bands)).toBeNull()
  })
})
