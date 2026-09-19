import { describe, expect, it } from 'vitest'
import type { Forces } from './forces'
import { buildGraph, type Graph, type GraphInput } from './graph'
import { cool, createSimulation, reheat, shuffle, tick, wakeLocal } from './simulation'

const linkOnly: Forces = { gravity: 0, spread: 0, strength: 1, distance: 1 }
const REST = 240

const page = (id: string): GraphInput['pages'][number] => ({
  id,
  title: id,
  folderId: 'f',
  spaceIds: [],
})

const chain = (count: number): Graph => {
  const input: GraphInput = {
    pages: Array.from({ length: count }, (_, i) => page(`p${i}`)),
    folders: [],
    spaces: [],
    connections: Array.from({ length: count - 1 }, (_, i) => ({
      from: `p${i}`,
      to: `p${i + 1}`,
      kind: 'body' as const,
    })),
  }
  const graph = buildGraph(input, { mode: 'connection', hideUnlinked: false, visible: null })
  graph.nodes.forEach((n, i) => {
    n.x = i * 400
    n.y = i % 2 ? 120 : -120
  })
  return graph
}

const run = (sim: Parameters<typeof tick>[0], ceiling: number): number => {
  let ticks = 0
  while (tick(sim) && ticks < ceiling) ticks++
  return ticks
}

describe('the simulation', () => {
  it('settles two linked nodes at the link distance plus their radii, then sleeps before the ceiling', () => {
    const graph = chain(2)
    const sim = createSimulation(graph, linkOnly, true)
    const ticks = run(sim, 600)
    const [a, b] = graph.nodes
    expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeCloseTo(REST + a.radius + b.radius, 0)
    expect(sim.awake).toBe(false)
    expect(ticks).toBeLessThan(600)
  })

  it('reheat holds a sleeping simulation warm past the ceiling and cool lets it settle again', () => {
    const sim = createSimulation(chain(2), linkOnly, true)
    run(sim, 600)
    expect(sim.awake).toBe(false)
    reheat(sim)
    expect(tick(sim)).toBe(true)
    for (let i = 0; i < 700; i++) tick(sim)
    expect(sim.awake).toBe(true)
    cool(sim)
    run(sim, 900)
    expect(sim.awake).toBe(false)
  })

  it('shuffle moves every node and wakes the simulation', () => {
    const graph = chain(6)
    const sim = createSimulation(graph, linkOnly, false)
    const before = graph.nodes.map((n) => [n.x, n.y])
    shuffle(sim)
    expect(sim.awake).toBe(true)
    graph.nodes.forEach((n, i) => {
      expect([n.x, n.y]).not.toEqual(before[i])
    })
  })

  it('wakeLocal pins every node but the named ones, runs a real settle, and unpins on sleep', () => {
    const graph = chain(200)
    const sim = createSimulation(graph, linkOnly, false)
    const moved = graph.nodes[5]
    moved.x += 3000
    const held = graph.nodes.map((n) => [n.x, n.y])
    wakeLocal(sim, new Set([moved.id]))
    expect(graph.nodes.filter((n) => n.pinned).length).toBe(199)
    const ticks = run(sim, 900)
    expect(ticks).toBeGreaterThan(5)
    expect(sim.awake).toBe(false)
    expect(sim.local).toBe(false)
    expect(graph.nodes.some((n) => n.pinned)).toBe(false)
    graph.nodes.forEach((n, i) => {
      if (n !== moved) expect([n.x, n.y]).toEqual(held[i])
    })
  })

  it('a shuffle during a local wake releases the pins', () => {
    const graph = chain(6)
    const sim = createSimulation(graph, linkOnly, false)
    wakeLocal(sim, new Set(['p0']))
    expect(graph.nodes.some((n) => n.pinned)).toBe(true)
    shuffle(sim)
    expect(graph.nodes.some((n) => n.pinned)).toBe(false)
    expect(sim.local).toBe(false)
    expect(sim.awake).toBe(true)
  })
})
