import { describe, expect, it } from 'vitest'
import type { GraphNode, NodeKind } from './graph'
import { cullLabels, labelReveal } from './labels'

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
  cullLabels(nodes, { x: 0, y: 0, zoom }, 400, 400, skip, cells, labelReveal(zoom))
  return [...cells.values()]
}

describe('label policy', () => {
  it('a title is absent at its kind threshold and whole above the band', () => {
    expect(labelReveal(0.59).page).toBe(0)
    expect(labelReveal(0.6).page).toBe(0)
    expect(labelReveal(2).page).toBe(1)
    expect(labelReveal(0.39).folder).toBe(0)
    expect(labelReveal(1).folder).toBe(1)
    expect(labelReveal(0.19).space).toBe(0)
    expect(labelReveal(0.5).space).toBe(1)
  })

  it('the band carries a title in, and each kind crosses it over its own share of zoom', () => {
    const mid = labelReveal(0.6 + (0.6 * 0.35) / 2).page
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(1)
    expect(labelReveal(0.2 + (0.2 * 0.35) / 2).space).toBeCloseTo(mid)
  })

  it('a kind below its threshold paints no title', () => {
    expect(culled(pair, 0.5, -1)).toEqual([])
  })

  it('one cell keeps one title and the larger node wins it', () => {
    expect(culled(pair, 1, -1)).toEqual([1])
  })

  it('the skipped node never paints and leaves the cell to its neighbour', () => {
    expect(culled(pair, 1, 1)).toEqual([0])
  })

  it('clears the map it is handed, so a cull answers for its own frame alone', () => {
    culled(pair, 1, -1)
    expect(culled(pair, 0.5, -1)).toEqual([])
  })
})
