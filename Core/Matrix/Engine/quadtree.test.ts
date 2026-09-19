import { describe, expect, it } from 'vitest'
import type { GraphNode } from './graph'
import { buildQuadtree, type Cell, find, visit } from './quadtree'

const node = (id: string, x: number, y: number, radius: number): GraphNode => ({
  id,
  kind: 'page',
  title: id,
  x,
  y,
  vx: 0,
  vy: 0,
  radius,
  degree: 0,
  pinned: false,
})

const corners = [
  node('a', 0, 0, 10),
  node('b', 100, 0, 30),
  node('c', 0, 100, 20),
  node('d', 100, 100, 5),
]

describe('the quadtree', () => {
  it('find returns the nearest node and null beyond the radius', () => {
    const tree = buildQuadtree([node('near', 0, 0, 10), node('far', 200, 0, 10)])
    expect(find(tree, 20, 0, 50)?.id).toBe('near')
    expect(find(tree, 2000, 2000, 10)).toBe(null)
  })

  it('a pointer inside a disc returns that node over a nearer centre that does not cover it', () => {
    const tree = buildQuadtree([node('small', 0, 0, 5), node('large', 30, 0, 25)])
    expect(find(tree, 12, 0, 100)?.id).toBe('large')
  })

  it('a cell carries the count and the centre of the nodes beneath it', () => {
    const tree = buildQuadtree(corners)
    const root = tree.root as Cell
    expect(root.count).toBe(4)
    expect(root.cx).toBe(50)
    expect(root.cy).toBe(50)
  })

  it('a cell carries the largest radius beneath it', () => {
    const root = buildQuadtree(corners).root as Cell
    expect(root.maxRadius).toBe(30)
  })

  it('visit skips a cell its callback claims', () => {
    const tree = buildQuadtree(corners)
    let all = 0
    visit(tree, () => {
      all++
      return false
    })
    let stopped = 0
    visit(tree, () => {
      stopped++
      return true
    })
    expect(stopped).toBe(1)
    expect(all).toBeGreaterThan(stopped)
  })
})
