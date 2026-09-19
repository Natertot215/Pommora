import { describe, expect, it } from 'vitest'
import type { GraphNode, NodeKind } from './graph'
import { cullLabels, revealed } from './labels'
import { DEFAULT_VIEWPORT } from './viewport'

const node = (id: string, kind: NodeKind, x: number, radius: number): GraphNode => ({
  id,
  kind,
  title: id,
  x,
  y: 0,
  vx: 0,
  vy: 0,
  radius,
  degree: 0,
  pinned: false,
})

const pair = [node('small', 'page', 0, 40), node('large', 'page', 1, 80)]

const cells = new Map<number, number>()
const culled = (nodes: GraphNode[], zoom: number, skip: number): number[] => {
  cullLabels(nodes, { ...DEFAULT_VIEWPORT, zoom }, 400, 400, skip, cells)
  return [...cells.values()]
}

describe('label policy', () => {
  it('revealed honours the kind threshold', () => {
    expect(revealed('page', 0.74)).toBe(false)
    expect(revealed('page', 0.75)).toBe(true)
    expect(revealed('folder', 0.49)).toBe(false)
    expect(revealed('folder', 0.5)).toBe(true)
    expect(revealed('space', 0.24)).toBe(false)
    expect(revealed('space', 0.25)).toBe(true)
  })

  it('a kind below its threshold paints no title', () => {
    expect(culled(pair, 0.7, -1)).toEqual([])
  })

  it('one cell keeps one title and the larger node wins it', () => {
    expect(culled(pair, DEFAULT_VIEWPORT.zoom, -1)).toEqual([1])
  })

  it('the skipped node never paints and leaves the cell to its neighbour', () => {
    expect(culled(pair, DEFAULT_VIEWPORT.zoom, 1)).toEqual([0])
  })

  it('clears the map it is handed, so a cull answers for its own frame alone', () => {
    culled(pair, DEFAULT_VIEWPORT.zoom, -1)
    expect(culled(pair, 0.7, -1)).toEqual([])
  })
})
