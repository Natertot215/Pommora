import { applyCollide, applyGravity, applyLink, applySpread, type Forces } from './forces'
import type { Graph, GraphNode } from './graph'
import { buildQuadtree, find, type Quadtree } from './quadtree'

// KNOBs — initial values; tuned by eye in the iteration pass (Task 8.3), never exposed.
const ALPHA_DECAY = 0.0228
const ALPHA_MIN = 0.001
const VELOCITY_DECAY = 0.4
const SLEEP_ENERGY = 0.01
const TICK_CEILING = 600
const DRAG_ALPHA_TARGET = 0.3
const SHUFFLE_JITTER = 40

export interface Simulation {
  graph: Graph
  forces: Forces
  alpha: number
  alphaTarget: number
  ticks: number
  awake: boolean
  tree: Quadtree
  local: boolean
}

export function createSimulation(graph: Graph, forces: Forces, awake: boolean): Simulation {
  return {
    graph,
    forces,
    alpha: awake ? 1 : 0,
    alphaTarget: 0,
    ticks: 0,
    awake,
    tree: buildQuadtree(graph.nodes),
    local: false,
  }
}

export function tick(sim: Simulation): boolean {
  if (!sim.awake) return false
  const { nodes, links } = sim.graph
  sim.alpha += (sim.alphaTarget - sim.alpha) * ALPHA_DECAY
  sim.tree = buildQuadtree(nodes)
  applyGravity(nodes, sim.forces, sim.alpha)
  applySpread(nodes, sim.tree, sim.forces, sim.alpha)
  applyLink(nodes, links, sim.forces, sim.alpha)
  applyCollide(nodes, sim.tree)
  let energy = 0
  let moving = 0
  for (const n of nodes) {
    if (n.pinned) {
      n.vx = n.vy = 0
      continue
    }
    n.vx *= 1 - VELOCITY_DECAY
    n.vy *= 1 - VELOCITY_DECAY
    n.x += n.vx
    n.y += n.vy
    energy += n.vx * n.vx + n.vy * n.vy
    moving++
  }
  sim.ticks++
  // Energy is per moving node, so a local wake of one page isn't judged against a thousand pinned ones; a held reheat (a drag) is exempt from the ceiling, which guards a settle that never converges.
  if (
    sim.alphaTarget === 0 &&
    (energy / Math.max(moving, 1) < SLEEP_ENERGY ||
      sim.alpha < ALPHA_MIN ||
      sim.ticks >= TICK_CEILING)
  )
    sleep(sim)
  return sim.awake
}

function releasePins(sim: Simulation): void {
  if (!sim.local) return
  for (const n of sim.graph.nodes) n.pinned = false
  sim.local = false
}

function sleep(sim: Simulation): void {
  sim.awake = false
  sim.alpha = 0
  sim.ticks = 0
  releasePins(sim)
  sim.tree = buildQuadtree(sim.graph.nodes)
}

function wake(sim: Simulation, alpha: number): void {
  releasePins(sim)
  sim.alpha = Math.max(sim.alpha, alpha)
  sim.ticks = 0
  sim.awake = true
}

export function reheat(sim: Simulation): void {
  sim.alphaTarget = DRAG_ALPHA_TARGET
  wake(sim, DRAG_ALPHA_TARGET)
}

export function cool(sim: Simulation): void {
  sim.alphaTarget = 0
  wake(sim, DRAG_ALPHA_TARGET)
}

export function shuffle(sim: Simulation): void {
  for (const n of sim.graph.nodes) {
    n.x += (Math.random() - 0.5) * SHUFFLE_JITTER
    n.y += (Math.random() - 0.5) * SHUFFLE_JITTER
    n.vx = n.vy = 0
  }
  sim.alphaTarget = 0
  wake(sim, 1)
}

export function wakeLocal(sim: Simulation, ids: ReadonlySet<string>): void {
  sim.alphaTarget = 0
  wake(sim, DRAG_ALPHA_TARGET)
  for (const n of sim.graph.nodes) n.pinned = !ids.has(n.id)
  sim.local = true
}

export const nodeAt = (sim: Simulation, x: number, y: number, slack: number): GraphNode | null =>
  find(sim.tree, x, y, slack)
