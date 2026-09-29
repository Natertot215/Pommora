import { describe, expect, it, vi } from 'vitest'
import type { Geometry, Row } from '@pommora/uix/Interactions/reorderModel'
import { rowDropLine } from '@pommora/uix/Menus'
import { RESERVED_PROPERTY_ID } from './properties'
import { nexusReorderIndex, type PaneDrop, paneSpec } from './paneDrop'

const r = (id: string, top: number, bottom: number): Row => ({
  id,
  top,
  bottom,
  mid: (top + bottom) / 2,
  left: 0,
  right: 100,
})

const geometry = (rows: Row[], regions: Record<string, [number, number]>): Geometry => ({
  rows,
  groups: new Map(
    Object.entries(regions).map(([key, [top, bottom]]) => [key, r(key, top, bottom)]),
  ),
  bottom: 200,
})

function drive(
  input: { assigned: string[]; ordersAll: boolean; pinned?: string },
  g: Geometry,
  id: string,
  y: number,
) {
  const onDrop = vi.fn<(drop: PaneDrop) => void>()
  const spec = paneSpec({
    ...input,
    allTitle: 'All',
    label: (x) => x,
    glyph: () => null,
    onDrop,
    watch: [],
  })
  const s = spec.snap(id, g)
  const slot = s && spec.resolve(id, { x: 0, y }, s)
  if (s && slot) spec.commit(id, slot, s)
  return {
    slot,
    line: s && slot ? spec.line?.(slot, s) : undefined,
    drop: onDrop.mock.calls[0]?.[0],
  }
}

describe('paneSpec — the schema pane', () => {
  // a* = assigned, x* = all (registry)
  const g = geometry([r('a1', 10, 30), r('a2', 30, 50), r('x1', 70, 90), r('x2', 90, 110)], {
    assigned: [10, 50],
    all: [70, 110],
  })
  const pane = { assigned: ['a1', 'a2'], ordersAll: true }
  const at = (id: string, y: number) => drive(pane, g, id, y)

  it('assigned→assigned reorders at the slot (C-5)', () => {
    const s = at('a2', 15)
    expect(s.drop).toEqual({ kind: 'reorder-assigned', propId: 'a2', toIndex: 0 })
    expect(s.line).toEqual(rowDropLine(10))
  })

  it('assigned→all is unassign with the area highlight and NO line (C-3/C-4)', () => {
    const s = at('a1', 80)
    expect(s.slot).toBe('unassign')
    expect(s.drop).toEqual({ kind: 'unassign', propId: 'a1' })
    expect(s.line).toBeNull()
  })

  it('all→assigned assigns at the slot with a line (C-2)', () => {
    const s = at('x1', 30)
    expect(s.drop).toEqual({ kind: 'assign', propId: 'x1', toIndex: 1 })
    expect(s.line).toEqual(rowDropLine(30))
  })

  it('all→all reorders the nexus order (C-1)', () => {
    expect(at('x1', 105).drop).toEqual({ kind: 'reorder-nexus', propId: 'x1', toIndex: 1 })
  })

  it('clamps a release outside both regions to the nearest lane', () => {
    expect(at('a1', 200).slot).toBe('unassign')
    expect(at('a1', 55).drop).toEqual({ kind: 'reorder-assigned', propId: 'a1', toIndex: 1 })
  })

  it('an empty target region still yields the slot at its top (assign into a bare collection)', () => {
    const only = geometry([r('x1', 70, 90)], { assigned: [10, 50], all: [70, 110] })
    const s = drive({ assigned: [], ordersAll: true }, only, 'x1', 20)
    expect(s.drop).toEqual({ kind: 'assign', propId: 'x1', toIndex: 0 })
    expect(s.line).toEqual(rowDropLine(10))
  })
})

describe('paneSpec — the visibility pane', () => {
  const g = geometry([r('a', 0, 20), r('b', 20, 40), r('h', 60, 80)], {
    assigned: [0, 50],
    all: [50, 100],
  })
  const pane = { assigned: ['a', 'b'], ordersAll: false, pinned: RESERVED_PROPERTY_ID.title }
  const at = (id: string, y: number) => drive(pane, g, id, y)

  it('reorders a shown row within the properties region', () => {
    expect(at('a', 35).drop).toEqual({ kind: 'reorder-assigned', propId: 'a', toIndex: 1 })
  })

  it('unhides a hidden row dragged into the properties region', () => {
    expect(at('h', 5).drop).toEqual({ kind: 'assign', propId: 'h', toIndex: 0 })
  })

  it('hides a shown row dropped in the hidden zone — membership drop: highlight, no line', () => {
    const s = at('a', 70)
    expect(s.drop).toEqual({ kind: 'unassign', propId: 'a' })
    expect(s.line).toBeNull()
    expect(s.slot).toBe('unassign')
  })

  it('keeps a hidden row inert over its own zone — no reorder within hidden', () => {
    expect(at('h', 70).slot).toBeNull()
  })

  it('never hides Title — a drop into the hidden zone is a no-op', () => {
    const withTitle = geometry(
      [r(RESERVED_PROPERTY_ID.title, 0, 20), r('b', 20, 40), r('h', 60, 80)],
      {
        assigned: [0, 50],
        all: [50, 100],
      },
    )
    const s = drive(
      { ...pane, assigned: [RESERVED_PROPERTY_ID.title, 'b'] },
      withTitle,
      RESERVED_PROPERTY_ID.title,
      70,
    )
    expect(s.slot).toBeNull()
  })

  it('clamps below the pane to the hidden zone; above stays its own gap', () => {
    expect(at('a', -10).slot).toBeNull()
    expect(at('a', 150).slot).toBe('unassign')
  })

  it('never highlights during a positional drop in the shown zone', () => {
    expect(at('h', 35).slot).not.toBe('unassign')
  })

  it('steps into the hidden zone under its own title; row slots name their row', () => {
    const spec = paneSpec({
      ...pane,
      allTitle: 'Hidden Properties',
      label: (x) => x,
      glyph: () => null,
      onDrop: vi.fn(),
      watch: [],
    })
    const s = spec.snap('a', g)!
    const into = spec.step?.('unassign', s)
    expect(into?.part).toBe('into')
    expect(into && spec.label(into.id)).toBe('Hidden Properties')
    expect(spec.step?.(spec.resolve('a', { x: 0, y: 35 }, s)!, s)).toBeNull()
  })
})

describe('nexusReorderIndex — visible All-Properties slot → FULL nexus-order index (breaker M-1)', () => {
  // Full order [A,B,C,D,E]; A,B assigned (not shown); visible unassigned = [C,D,E].
  const order = ['A', 'B', 'C', 'D', 'E']
  const visible = ['C', 'D', 'E']

  it('dropping E at the visible top lands just before C in the full order — never ahead of the assigned ids', () => {
    expect(nexusReorderIndex(order, visible, 'E', 0)).toBe(2)
  })

  it('dropping E between visible C and D lands between them in the full order', () => {
    expect(nexusReorderIndex(order, visible, 'E', 1)).toBe(3)
  })

  it('dropping C past the last visible row appends after E', () => {
    expect(nexusReorderIndex(order, visible, 'C', 2)).toBe(4)
  })

  it('no visible rows → append to the full order end', () => {
    expect(nexusReorderIndex(['A', 'B'], [], 'X', 0)).toBe(2)
  })
})
