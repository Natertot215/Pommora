import { describe, expect, it } from 'vitest'
import type { Geometry, Row } from '@pommora/uix/Interactions/reorderModel'
import {
  type BandModel,
  type BandNode,
  bandBox,
  bandSlot,
  bandSnap,
  shownHeads,
  springsInto,
} from './bandModel'
import type { BandRef } from './bandRouter'

const row = (id: string, top: number, h = 20): Row => ({
  id,
  top,
  bottom: top + h,
  mid: top + h / 2,
  left: 0,
  right: 100,
})
const geo = (rows: Row[], boxes: [string, number, number][] = [], bottom = 400): Geometry => ({
  rows,
  groups: new Map(boxes.map(([k, top, end]) => [bandBox(k), row(k, top, end - top)])),
  bottom,
})
const setRef = (key: string, parentKey: string | null, depth: number): BandRef => ({
  kind: 'set',
  key,
  depth,
  parentKey,
})
const drop = (y: number, s: ReturnType<typeof bandSnap>) => (s ? bandSlot(s, y) : undefined)
const ANY = () => () => true

const tree: BandRef[] = [
  setRef('A', null, 0),
  setRef('A1', 'A', 1),
  setRef('A1a', 'A1', 2),
  setRef('B', null, 0),
]
const g = geo([row('A', 0), row('A1', 40), row('A1a', 80), row('B', 120)], [], 140)

describe('bandSlot — Sets', () => {
  it('a nested last child released over its own head returns (the own-row reparent)', () => {
    const s = bandSnap(g, tree, 'A1a', true, ANY)
    expect(drop(85, s)).toBeNull()
    expect(drop(95, s)).toBeNull()
  })

  it('into a Set with no displayed child lands first, indented one level at its content end', () => {
    const s = bandSnap(g, tree, 'B', true, ANY)
    expect(drop(90, s)).toMatchObject({
      drop: { kind: 'into', parentKey: 'A1a' },
      top: 100,
      depth: 3,
    })
  })

  it('into a Set with a displayed child is the slot before that child', () => {
    const s = bandSnap(g, tree, 'B', true, ANY)
    expect(drop(10, s)).toMatchObject({
      drop: { kind: 'before', beforeKey: 'A1', parentKey: 'A' },
      top: 40,
      depth: 1,
    })
  })

  it("every parent's end is reachable: the last child's after-zone, then past the list the root end", () => {
    const s = bandSnap(g, tree, 'B', true, ANY)
    expect(drop(98, s)).toMatchObject({
      drop: { kind: 'before', beforeKey: null, parentKey: 'A1' },
    })
    expect(drop(58, s)).toMatchObject({ drop: { kind: 'before', beforeKey: null, parentKey: 'A' } })
    const top = bandSnap(g, tree, 'A1a', true, ANY)
    expect(drop(200, top)).toMatchObject({
      drop: { kind: 'before', beforeKey: null, parentKey: null },
      depth: 0,
    })
  })

  it('a slot that reproduces the current position draws nothing', () => {
    const s = bandSnap(g, tree, 'A', true, ANY)
    expect(drop(122, s)).toBeNull()
    expect(drop(-10, s)).toBeNull()
    expect(drop(118, bandSnap(g, tree, 'B', true, ANY))).toBeNull()
  })

  it('a flat surface splits each head at its middle and never nests', () => {
    const flat: BandRef[] = [setRef('A', null, 0), setRef('B', null, 0), setRef('C', null, 0)]
    const fg = geo(
      [row('A', 0), row('B', 40), row('C', 80)],
      [
        ['A', 0, 36],
        ['B', 40, 76],
        ['C', 80, 116],
      ],
    )
    const s = bandSnap(fg, flat, 'A', false, ANY)
    expect(drop(45, s)).toBeNull()
    expect(drop(60, s)).toMatchObject({ drop: { kind: 'before', beforeKey: 'C' }, top: 80 })
    expect(drop(100, s)).toMatchObject({ drop: { beforeKey: null, parentKey: null }, top: 116 })
  })
})

describe('bandSlot — buckets', () => {
  const heads: BandRef[] = [
    setRef('S', null, 0),
    { kind: 'bucket', key: 'S/x', depth: 1, parentKey: 'S', value: 'x' },
    { kind: 'bucket', key: 'S/y', depth: 1, parentKey: 'S', value: 'y' },
    setRef('T', null, 0),
    { kind: 'bucket', key: 'T/y', depth: 1, parentKey: 'T', value: 'y' },
  ]
  const bg = geo(
    [row('S', 0), row('S/x', 30), row('S/y', 60), row('T', 100), row('T/y', 130)],
    [
      ['S/x', 30, 55],
      ['S/y', 60, 85],
      ['T/y', 130, 155],
    ],
    200,
  )

  it('never lights a Set: a Set head resolves to the nearest bucket gap', () => {
    const s = bandSnap(bg, heads, 'S/x', true, ANY)
    expect(drop(90, s)).toMatchObject({ drop: { kind: 'before', beforeKey: null, parentKey: 'S' } })
    expect(drop(118, s)).toMatchObject({
      drop: { kind: 'before', beforeKey: 'T/y', parentKey: 'T' },
    })
  })

  it('a slot before the same value in another Set declines', () => {
    expect(drop(132, bandSnap(bg, heads, 'S/y', true, ANY))).toBeNull()
    expect(drop(132, bandSnap(bg, heads, 'S/x', true, ANY))).toMatchObject({
      drop: { beforeKey: 'T/y' },
    })
  })
})

describe('the model', () => {
  const nodes: BandNode[] = [
    {
      kind: 'set',
      key: 'A',
      depth: 0,
      parentKey: null,
      set: {} as never,
      opens: true,
      empty: false,
    },
    {
      kind: 'set',
      key: 'A1',
      depth: 1,
      parentKey: 'A',
      set: {} as never,
      opens: false,
      empty: true,
    },
    { kind: 'tail', key: 'A/_ungrouped', depth: 1, parentKey: 'A' },
    {
      kind: 'set',
      key: 'B',
      depth: 0,
      parentKey: null,
      set: {} as never,
      opens: true,
      empty: true,
    },
  ]
  const model: BandModel = { nodes, byKey: new Map(nodes.map((n) => [n.key, n])) }

  it('shows heads in preorder, dropping tails and the descendants of a collapsed band', () => {
    expect(shownHeads(nodes, new Set()).map((n) => n.key)).toEqual(['A', 'A1', 'B'])
    expect(shownHeads(nodes, new Set(['A'])).map((n) => n.key)).toEqual(['A', 'B'])
  })

  it('springs a Set only where the drag could land', () => {
    expect(springsInto(model, 'B', nodes[1], true)).toBe(true)
    expect(springsInto(model, 'A', nodes[1], true)).toBe(false)
    expect(springsInto(model, 'B', nodes[1], false)).toBe(false)
  })
})
