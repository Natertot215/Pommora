import { applyCollide, applyGravity, applyLink, applySpread, type Forces } from './forces'
import type { Graph, GraphNode } from './graph'
import { buildQuadtree, find, type Quadtree } from './quadtree'

// KNOBs — the alpha ramp, the sleep floor, the drag and return pulls, and the shuffle jitter.
const ALPHA_DECAY = 0.0228
const ALPHA_MIN = 0.001
const VELOCITY_DECAY = 0.4
const SLEEP_ENERGY = 0.01
const DRAG_ALPHA_TARGET = 0.3
const DRAG_PULL = 0.25
const SHUFFLE_JITTER = 0.6

export interface Simulation {
  graph: Graph
  forces: Forces
  alpha: number
  alphaTarget: number
  awake: boolean
  tree: Quadtree
  local: boolean
  drag: { id: string; x: number; y: number } | null
}

export function createSimulation(graph: Graph, forces: Forces, awake: boolean): Simulation {
  return {
    graph,
    forces,
    alpha: awake ? 1 : 0,
    alphaTarget: 0,
    awake,
    tree: buildQuadtree(graph.nodes),
    local: false,
    drag: null,
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
  // The held node is pulled toward the pointer rather than placed at it, so it arrives through its own springs and its neighbours resist the move.
  if (sim.drag) {
    const n = nodes[sim.graph.index.get(sim.drag.id) ?? -1]
    if (n) {
      n.vx += (sim.drag.x - n.x) * DRAG_PULL
      n.vy += (sim.drag.y - n.y) * DRAG_PULL
    }
  }
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
  // Energy is per moving node, so a local wake of one page isn't judged against a thousand pinned ones.
  if (
    sim.alphaTarget === 0 &&
    (energy / Math.max(moving, 1) < SLEEP_ENERGY || sim.alpha < ALPHA_MIN)
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
  sim.drag = null
  releasePins(sim)
  sim.tree = buildQuadtree(sim.graph.nodes)
}

function wake(sim: Simulation, alpha: number): void {
  releasePins(sim)
  sim.alpha = Math.max(sim.alpha, alpha)
  sim.awake = true
}

export function reheat(sim: Simulation): void {
  sim.alphaTarget = DRAG_ALPHA_TARGET
  wake(sim, DRAG_ALPHA_TARGET)
}

// A mode change replaces every link, so the picture re-solves at full heat rather than relaxing out of the shape the last mode left it in.
export function resettle(sim: Simulation): void {
  sim.alphaTarget = 0
  wake(sim, 1)
}

export function cool(sim: Simulation): void {
  sim.alphaTarget = 0
  wake(sim, DRAG_ALPHA_TARGET)
}

export function shuffle(sim: Simulation): void {
  let extent = 0
  for (const n of sim.graph.nodes) extent = Math.max(extent, Math.hypot(n.x, n.y))
  const jitter = extent * SHUFFLE_JITTER
  for (const n of sim.graph.nodes) {
    n.x += (Math.random() - 0.5) * jitter
    n.y += (Math.random() - 0.5) * jitter
    n.vx = n.vy = 0
    n.pinned = false
  }
  wake(sim, 1)
}

export function wakeLocal(sim: Simulation, ids: ReadonlySet<string>): void {
  wake(sim, DRAG_ALPHA_TARGET)
  for (const n of sim.graph.nodes) n.pinned = !ids.has(n.id)
  sim.local = true
}

export const nodeAt = (sim: Simulation, x: number, y: number, slack: number): GraphNode | null =>
  find(sim.tree, x, y, slack)
