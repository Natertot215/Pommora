import { describe, expect, it } from 'vitest'
import { buildGraph, type Graph, type GraphInput } from './graph'
import { place, spiral } from './placement'

const input: GraphInput = {
  pages: [
    { id: 'a', title: 'Alpha', folderId: 'f', spaceIds: [] },
    { id: 'b', title: 'Beta', folderId: 'f', spaceIds: [] },
    { id: 'c', title: 'Gamma', folderId: 'f', spaceIds: [] },
    { id: 'd', title: 'Delta', folderId: 'f', spaceIds: [] },
  ],
  folders: [],
  spaces: [],
  connections: [
    { from: 'a', to: 'c', kind: 'body' },
    { from: 'b', to: 'c', kind: 'body' },
  ],
}

const build = (): Graph =>
  buildGraph(input, { mode: 'connection', hideUnlinked: false, visible: null })

const at = (graph: Graph, id: string) => graph.nodes[graph.index.get(id) as number]

const persisted = new Map([
  ['a', { x: 100, y: 0 }],
  ['b', { x: 0, y: 100 }],
])

describe('place', () => {
  it('seats a first-ever layout on a spiral that is identical across calls', () => {
    const first = build()
    const second = build()
    expect(place(first, new Map()).size).toBe(4)
    place(second, new Map())
    expect(first.nodes.map((n) => [n.x, n.y])).toEqual(second.nodes.map((n) => [n.x, n.y]))
    expect([first.nodes[2].x, first.nodes[2].y]).toEqual([spiral(2).x, spiral(2).y])
  })

  it('seats a persisted position exactly and reports only the nodes without one', () => {
    const graph = build()
    const fresh = place(graph, persisted)
    expect(at(graph, 'a').x).toBe(100)
    expect(at(graph, 'b').y).toBe(100)
    expect([...fresh].sort()).toEqual(['c', 'd'])
  })

  it('seats a new node at the centroid of its placed neighbours', () => {
    const graph = build()
    place(graph, persisted)
    expect(Math.abs(at(graph, 'c').x - 50)).toBeLessThanOrEqual(6)
    expect(Math.abs(at(graph, 'c').y - 50)).toBeLessThanOrEqual(6)
  })

  it('seats a new orphan outside every placed node', () => {
    const graph = build()
    place(graph, persisted)
    const outer = Math.hypot(at(graph, 'd').x, at(graph, 'd').y)
    expect(outer).toBeGreaterThan(Math.hypot(at(graph, 'a').x, at(graph, 'a').y))
    expect(outer).toBeGreaterThan(Math.hypot(at(graph, 'b').x, at(graph, 'b').y))
    expect(outer).toBeGreaterThan(Math.hypot(at(graph, 'c').x, at(graph, 'c').y))
  })
})
