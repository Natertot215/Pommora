import { describe, expect, it } from 'vitest'
import { buildGraph, type GraphInput } from './graph'
import { place } from './placement'
import { createSimulation, tick } from './simulation'

const PAGES = 4300
const FOLDERS = 200
const SPACES = 20
const CONNECTIONS = 6000
const TICK_BUDGET_MS = 400

function seeded(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

function generate(): GraphInput {
  const rand = seeded(7)
  const pick = (n: number): number => Math.floor(rand() * n)
  const folders = Array.from({ length: FOLDERS }, (_, i) => ({
    id: `f${i}`,
    title: `Folder ${i}`,
    parentId: i < 20 ? null : `f${pick(20)}`,
  }))
  const spaces = Array.from({ length: SPACES }, (_, i) => ({
    id: `s${i}`,
    title: `Space ${i}`,
    spaceIds: [],
  }))
  const pages = Array.from({ length: PAGES }, (_, i) => ({
    id: `p${i}`,
    title: `Page ${i}`,
    folderId: `f${pick(FOLDERS)}`,
    spaceIds: rand() < 0.5 ? [`s${pick(SPACES)}`] : [],
  }))
  const connections = Array.from({ length: CONNECTIONS }, () => ({
    from: `p${pick(PAGES)}`,
    to: `p${pick(PAGES)}`,
    kind: 'body' as const,
  }))
  return { pages, folders, spaces, connections }
}

describe('the engine at twenty times NexusOS', () => {
  it(`ticks a ${PAGES}-page Location graph under ${TICK_BUDGET_MS} ms`, () => {
    const graph = buildGraph(generate(), { mode: 'location', hideUnlinked: false, visible: null })
    place(graph, new Map())
    const sim = createSimulation(graph, { gravity: 1, spread: 1, strength: 1, distance: 1 }, true)
    for (let i = 0; i < 10; i++) tick(sim)
    const t0 = performance.now()
    for (let i = 0; i < 30; i++) tick(sim)
    const mean = (performance.now() - t0) / 30
    console.info(
      `matrix tick: ${mean.toFixed(2)} ms over ${graph.nodes.length} nodes / ${graph.links.length} links`,
    )
    expect(mean).toBeLessThan(TICK_BUDGET_MS)
  })
})
