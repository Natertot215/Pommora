import { describe, expect, it } from 'vitest'
import { type Geometry, laneSlot, type Row } from './reorderModel'
import { DROP_LINE_INSET } from './shared'
import { lineList, rowLine, rowStep } from './lineList'

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
const NONE = (): boolean => false
const END = 'end'
const snapOf = (
  g: Geometry,
  id: string,
  bandOf: ReadonlyMap<string, string>,
  vacant: (key: string) => boolean,
) =>
  lineList({
    laneOf: () => (x) => bandOf.get(x),
    boxes: (geo) =>
      new Map(geo.rows.filter((r) => vacant(r.id)).map((r) => [r.id, { ...r, top: r.bottom }])),
    end: END,
    commit: () => {},
    label: () => '',
    watch: [],
  }).snap(id, g)

describe('lineList', () => {
  it('a drop below the row the dragged one already follows is a no-op, not a slot above it', () => {
    const snap = snapOf(geo(rows), 'r3', bands, NONE)!
    expect(laneSlot(snap, 35, false)).toBeNull()
    expect(laneSlot(snap, 55, false)).toBeNull()
  })

  it("a band's first row released over itself stays put", () => {
    const snap = snapOf(geo(rows), 'r1', bands, NONE)!
    expect(laneSlot(snap, 5, false)).toBeNull()
    expect(laneSlot(snap, 35, false)).toMatchObject({ lane: 'a', index: 1, before: 'r3' })
  })

  it("the line runs from the dragged row's left to the end filler, inset both sides and indented to its lane's depth", () => {
    const filler = row(END, 0, 180, 200)
    const snap = snapOf(
      geo([row('r1', 0, 10, 180), ...rows.slice(1)], [filler]),
      'r1',
      bands,
      NONE,
    )!
    const slot = laneSlot(snap, 35, false)!
    const left = 10 + DROP_LINE_INSET
    const width = 180 - DROP_LINE_INSET - left
    expect(rowLine(slot, snap, '8px')).toEqual({
      top: slot.edge,
      left: `calc(${left.toFixed(1)}px + 8px)`,
      width: `calc(${width.toFixed(1)}px - 8px)`,
      right: 'auto',
    })
  })

  const nested = geo([row('a', 0), row('r1', 20), row('b', 50), row('c', 80), row('r2', 100)])
  const nestedBands = new Map([
    ['r1', 'a'],
    ['r2', 'c'],
  ])
  const vacant = (key: string): boolean => key === 'b'

  it("a band holding no rows of its own takes one slot under its head, reached from the head's lower half", () => {
    const snap = snapOf(nested, 'r2', nestedBands, vacant)!
    expect(laneSlot(snap, 66, true)).toMatchObject({ lane: 'b', index: 0, before: null, edge: 70 })
    expect(laneSlot(snap, 52, true)).toMatchObject({ lane: 'a', before: null })
  })

  it("a headed lane's first slot steps Into its band, and the rest name their rows", () => {
    const snap = snapOf(nested, 'r1', nestedBands, vacant)!
    expect(rowStep(laneSlot(snap, 66, true)!, snap, true)).toEqual({ part: 'into', id: 'b' })
    const first = laneSlot(snap, 95, true)!
    expect(rowStep(first, snap, true)).toEqual({ part: 'into', id: 'c' })
    expect(rowStep(first, snap, false)).toEqual({ part: 'before', id: 'r2' })
    expect(rowStep(laneSlot(snap, 115, true)!, snap, true)).toEqual({ part: 'after', id: 'r2' })
  })

  it('measures nothing for a row it never saw', () => {
    expect(snapOf(geo(rows), 'gone', bands, NONE)).toBeNull()
  })
})
