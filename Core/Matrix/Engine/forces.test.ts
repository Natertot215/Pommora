import { describe, expect, it } from 'vitest'
import {
  applyCollide,
  applyLink,
  applySpread,
  BASE_RADIUS,
  type Forces,
  LINK_GAP,
  RADIUS_MAX,
  radiusOf,
} from './forces'
import type { GraphLink, GraphNode, LinkKind } from './graph'
import { buildQuadtree } from './quadtree'

const node = (id: string, x: number, radius: number, degree: number): GraphNode => ({
  id,
  kind: 'page',
  title: id,
  x,
  y: 0,
  vx: 0,
  vy: 0,
  radius,
  degree,
  pinned: false,
})

const inbound = (counts: Partial<Record<LinkKind, number>>): Record<LinkKind, number> => ({
  body: 0,
  citation: 0,
  frontmatter: 0,
  space: 0,
  location: 0,
  ...counts,
})

const linkOnly: Forces = { gravity: 0, spread: 0, strength: 1, distance: 1 }
const even: Forces = { gravity: 1, spread: 1, strength: 1, distance: 1 }
const body: GraphLink[] = [{ source: 0, target: 1, kind: 'body' }]

describe('radiusOf', () => {
  it('compounds a page linearly with its inbound links and never with its outbound', () => {
    const one = radiusOf('page', inbound({ body: 1 }), 0)
    const two = radiusOf('page', inbound({ body: 2 }), 0)
    const three = radiusOf('page', inbound({ body: 3 }), 0)
    expect(one - BASE_RADIUS.page).toBeCloseTo(two - one)
    expect(two - one).toBeCloseTo(three - two)
    expect(radiusOf('page', inbound({}), 0)).toBe(BASE_RADIUS.page)
  })

  it('grows a hub with its members and clamps at the maximum', () => {
    expect(radiusOf('space', inbound({}), 10)).toBeGreaterThan(BASE_RADIUS.space)
    expect(radiusOf('space', inbound({}), 10_000)).toBe(RADIUS_MAX)
    expect(radiusOf('folder', inbound({}), 40)).toBe(BASE_RADIUS.folder * 2)
  })

  it('compounds a Space linearly with its Space links, apart from its members', () => {
    expect(radiusOf('space', inbound({}), 0, 5)).toBe(BASE_RADIUS.space * 1.5)
    const one = radiusOf('space', inbound({}), 0, 1)
    const two = radiusOf('space', inbound({}), 0, 2)
    expect(one - BASE_RADIUS.space).toBeCloseTo(two - one)
    expect(radiusOf('space', inbound({}), 4, 2) - radiusOf('space', inbound({}), 4, 1)).toBeCloseTo(
      two - one,
    )
  })
})

describe('applySpread', () => {
  it('pushes two nodes apart', () => {
    const nodes = [node('a', -10, 40, 1), node('b', 10, 40, 1)]
    applySpread(nodes, buildQuadtree(nodes), even, 1)
    expect(nodes[0].vx).toBeLessThan(0)
    expect(nodes[1].vx).toBeGreaterThan(0)
  })
})

describe('applyLink', () => {
  it('pulls its ends toward the rest length', () => {
    const nodes = [node('a', 0, 40, 1), node('b', 1000, 40, 1)]
    for (let i = 0; i < 400; i++) {
      applyLink(nodes, body, linkOnly, 1)
      for (const n of nodes) {
        n.vx *= 0.6
        n.x += n.vx
      }
    }
    const rest = 240 + nodes[0].radius + nodes[1].radius
    expect(Math.abs(nodes[1].x - nodes[0].x)).toBeCloseTo(rest, 0)
  })

  it('divides a hub link by the smaller of the two degrees', () => {
    const impulse = (a: number, b: number): number => {
      const nodes = [node('a', 0, 40, a), node('b', 1000, 40, b)]
      applyLink(nodes, body, linkOnly, 1)
      return Math.abs(nodes[0].vx) + Math.abs(nodes[1].vx)
    }
    expect(impulse(1, 5)).toBeCloseTo(impulse(1, 1))
    expect(impulse(5, 5)).toBeCloseTo(impulse(1, 1) / 5)
  })
})

describe('applyCollide', () => {
  it('separates overlapping nodes to their radii plus the link gap', () => {
    const nodes = [node('a', 0, 40, 1), node('b', 50, 40, 1)]
    for (let i = 0; i < 200; i++) {
      applyCollide(nodes, buildQuadtree(nodes))
      for (const n of nodes) {
        n.x += n.vx
        n.vx = 0
      }
    }
    expect(nodes[1].x - nodes[0].x).toBeCloseTo(nodes[0].radius + nodes[1].radius + LINK_GAP * 2, 0)
  })
})
