import { describe, expect, it, vi } from 'vitest'
import type { Geometry, Row } from '../Interactions/reorderModel'
import { menuDropLine } from './MenuRows'
import { type PaneDrop, paneSpec } from './paneDrop'

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
  input: { members: string[]; ordersRest: boolean; pinned?: string },
  g: Geometry,
  id: string,
  y: number,
) {
  const onDrop = vi.fn<(drop: PaneDrop) => void>()
  const spec = paneSpec({
    ...input,
    titles: { members: 'Assigned', rest: 'All' },
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
  // a* = members, x* = the rest
  const g = geometry([r('a1', 10, 30), r('a2', 30, 50), r('x1', 70, 90), r('x2', 90, 110)], {
    members: [10, 50],
    rest: [70, 110],
  })
  const pane = { members: ['a1', 'a2'], ordersRest: true }
  const at = (id: string, y: number) => drive(pane, g, id, y)

  it('a release below the pane writes nothing', () => {
    expect(at('a2', 650).drop).toBeUndefined()
    expect(at('x1', 650).drop).toBeUndefined()
  })

  it('members→members reorders at the slot', () => {
    const s = at('a2', 15)
    expect(s.drop).toEqual({ kind: 'reorder-members', id: 'a2', toIndex: 0 })
    expect(s.line).toEqual(menuDropLine({ edge: 10 }))
  })

  it('members→the rest leaves with the area highlight and NO line', () => {
    const s = at('a1', 80)
    expect(s.slot).toBe('leave')
    expect(s.drop).toEqual({ kind: 'leave', id: 'a1' })
    expect(s.line).toBeNull()
  })

  it('the rest→members joins at the slot with a line', () => {
    const s = at('x1', 30)
    expect(s.drop).toEqual({ kind: 'join', id: 'x1', toIndex: 1 })
    expect(s.line).toEqual(menuDropLine({ edge: 30 }))
  })

  it('the rest→the rest reorders the full order', () => {
    expect(at('x1', 105).drop).toEqual({ kind: 'reorder-rest', id: 'x1', toIndex: 1 })
  })

  it('clamps a release outside both regions to the nearest lane', () => {
    expect(at('a1', 200).slot).toBe('leave')
    expect(at('a1', 55).drop).toEqual({ kind: 'reorder-members', id: 'a1', toIndex: 1 })
  })

  it('the members lane owns the space down to the rest heading, both directions', () => {
    const tall = geometry([r('a1', 10, 30), r('a2', 30, 50), r('x1', 180, 200)], {
      members: [10, 150],
      rest: [150, 200],
    })
    const drop = (id: string, y: number) => drive(pane, tall, id, y).drop
    expect(drop('a1', 120)).toEqual({ kind: 'reorder-members', id: 'a1', toIndex: 1 })
    expect(drop('x1', 120)).toEqual({ kind: 'join', id: 'x1', toIndex: 2 })
  })

  it('an empty target region still yields the slot at its top (a join into an empty members lane)', () => {
    const only = geometry([r('x1', 70, 90)], { members: [10, 50], rest: [70, 110] })
    const s = drive({ members: [], ordersRest: true }, only, 'x1', 20)
    expect(s.drop).toEqual({ kind: 'join', id: 'x1', toIndex: 0 })
    expect(s.line).toEqual(menuDropLine({ edge: 10 }))
  })
})

describe('paneSpec — the visibility pane', () => {
  const g = geometry([r('a', 0, 20), r('b', 20, 40), r('h', 60, 80)], {
    members: [0, 50],
    rest: [50, 100],
  })
  const pane = { members: ['a', 'b'], ordersRest: false, pinned: 'pinned' }
  const at = (id: string, y: number) => drive(pane, g, id, y)

  it('reorders a shown row within the properties region', () => {
    expect(at('a', 35).drop).toEqual({ kind: 'reorder-members', id: 'a', toIndex: 1 })
  })

  it('unhides a hidden row dragged into the properties region', () => {
    expect(at('h', 5).drop).toEqual({ kind: 'join', id: 'h', toIndex: 0 })
  })

  it('hides a shown row dropped in the hidden zone — membership drop: highlight, no line', () => {
    const s = at('a', 70)
    expect(s.drop).toEqual({ kind: 'leave', id: 'a' })
    expect(s.line).toBeNull()
    expect(s.slot).toBe('leave')
  })

  it('keeps a hidden row inert over its own zone — no reorder within hidden', () => {
    expect(at('h', 70).slot).toBeNull()
  })

  it('never hides the pinned row — a drop into the hidden zone is a no-op', () => {
    const withTitle = geometry([r('pinned', 0, 20), r('b', 20, 40), r('h', 60, 80)], {
      members: [0, 50],
      rest: [50, 100],
    })
    const s = drive({ ...pane, members: ['pinned', 'b'] }, withTitle, 'pinned', 70)
    expect(s.slot).toBeNull()
  })

  it('clamps below the rows to the hidden zone; outside the pane resolves nothing', () => {
    expect(at('a', -10).slot).toBeNull()
    expect(at('a', 150).slot).toBe('leave')
    expect(at('a', 650).slot).toBeNull()
  })

  it('never highlights during a positional drop in the shown zone', () => {
    expect(at('h', 35).slot).not.toBe('leave')
  })

  it('steps into the hidden zone under its own title; row slots name their row', () => {
    const spec = paneSpec({
      ...pane,
      titles: { members: 'Shown Properties', rest: 'Hidden Properties' },
      label: (x) => x,
      glyph: () => null,
      onDrop: vi.fn(),
      watch: [],
    })
    const s = spec.snap('a', g)!
    const into = spec.step?.('leave', s)
    expect(into?.part).toBe('into')
    expect(into && spec.label(into.id)).toBe('Hidden Properties')
    expect(spec.step?.(spec.resolve('a', { x: 0, y: 35 }, s)!, s)).toBeNull()
  })
})
