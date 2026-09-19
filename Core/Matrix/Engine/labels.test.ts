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

describe('label policy', () => {
  it('revealed honours the kind threshold', () => {
    expect(revealed('page', 0.9)).toBe(false)
    expect(revealed('page', 1)).toBe(true)
    expect(revealed('folder', 0.6)).toBe(true)
    expect(revealed('space', 0.34)).toBe(false)
    expect(revealed('space', 0.35)).toBe(true)
  })

  it('a kind below its threshold paints no title', () => {
    expect(cullLabels(pair, { ...DEFAULT_VIEWPORT, zoom: 0.9 }, 400, 400, -1)).toEqual([])
  })

  it('one cell keeps one title and the larger disc wins it', () => {
    expect(cullLabels(pair, DEFAULT_VIEWPORT, 400, 400, -1)).toEqual([1])
  })

  it('the skipped node never paints and leaves the cell to its neighbour', () => {
    expect(cullLabels(pair, DEFAULT_VIEWPORT, 400, 400, 1)).toEqual([0])
  })
})
