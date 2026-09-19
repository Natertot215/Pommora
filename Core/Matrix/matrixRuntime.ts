import { useSession } from '../Session/store'
import type { Forces } from './Engine/forces'
import { buildGraph, type Graph } from './Engine/graph'
import { place } from './Engine/placement'
import {
  cool,
  createSimulation,
  nodeAt,
  reheat,
  shuffle,
  type Simulation,
  tick,
  wakeLocal,
} from './Engine/simulation'
import { DEFAULT_VIEWPORT, fit, panBy, type Stage, type Viewport } from './Engine/viewport'
import type { MatrixConfig } from './matrixConfig'
import { matrixVisible, matrixWalk, type MatrixWalk } from './matrixInput'
import type { Positions } from './matrixLayout'

// KNOB — the hit slack past a node's edge, in world units.
const HIT_SLACK = 4
// KNOB — pans and zooms inside this window fold into one viewport write.
const VIEWPORT_SAVE_MS = 400

type Listener = () => void

interface Surface {
  visible: () => boolean
}

interface Built {
  tree: unknown
  reply: unknown
  walk: MatrixWalk
  visible: ReadonlySet<string> | null
  group: unknown
  filter: unknown
  forces: unknown
  display: MatrixConfig['display']
}

const EMPTY: Graph = { nodes: [], links: [], index: new Map() }

class MatrixRuntime {
  graph: Graph = EMPTY
  sim: Simulation | null = null
  viewport: Viewport = DEFAULT_VIEWPORT
  stage: Stage = { x: 0, y: 0, width: 0, height: 0 }
  hoveredId: string | null = null
  draggingId: string | null = null
  // Phase 7: the Move To fade's departing circles.
  ghosts: Array<{ x: number; y: number; radius: number; born: number }> = []
  // Phase 7: the Move To fade's arriving circles, by id and birth.
  arrivals = new Map<string, number>()
  private surfaces = new Set<Surface>()
  private listeners = new Set<Listener>()
  private frame = 0
  private built: Built | null = null
  private wasAwake = false
  private fitOnSettle = false
  private unsubscribe: (() => void) | null = null
  private save: ReturnType<typeof setTimeout> | null = null

  attach(surface: Surface): () => void {
    this.surfaces.add(surface)
    if (this.surfaces.size === 1) {
      this.unsubscribe = useSession.subscribe(() => this.sync())
      this.sync()
    }
    this.resume()
    return () => {
      this.surfaces.delete(surface)
      if (this.surfaces.size === 0) {
        this.unsubscribe?.()
        this.unsubscribe = null
        if (this.sim?.awake) this.settled()
        this.clear()
      }
    }
  }

  // An arrow property, so `useSyncExternalStore(matrixRuntime.subscribe, …)` keeps `this`.
  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  resume(): void {
    this.schedule()
  }

  private clear(): void {
    this.flushViewport()
    this.built = null
    this.graph = EMPTY
    this.sim = null
    this.wasAwake = false
    this.fitOnSettle = false
    this.hoveredId = null
    this.draggingId = null
    this.ghosts = []
    this.arrivals.clear()
  }

  private sync(): void {
    const s = useSession.getState()
    if (!s.tree) return
    if (!s.matrixLoaded) {
      if (this.built) this.clear()
      void s.loadMatrix()
      return
    }
    const c = s.matrixConfig
    const b = this.built
    if (
      b &&
      b.tree === s.tree &&
      b.reply === s.matrixGraph &&
      b.group === c.group &&
      b.filter === c.filter &&
      b.display.unlinked === c.display.unlinked
    ) {
      if (b.forces !== c.forces) this.setForces(c.forces)
      if (b.display !== c.display) this.invalidate()
      b.forces = c.forces
      b.display = c.display
      return
    }
    const first = b === null
    const walk =
      b && b.tree === s.tree && b.reply === s.matrixGraph
        ? b.walk
        : matrixWalk(s.tree, s.matrixGraph)
    const visible =
      b && b.walk === walk && b.filter === c.filter ? b.visible : matrixVisible(walk, c.filter)
    this.built = {
      tree: s.tree,
      reply: s.matrixGraph,
      walk,
      visible,
      group: c.group,
      filter: c.filter,
      forces: c.forces,
      display: c.display,
    }
    const graph = buildGraph(walk.input, {
      mode: c.group.mode,
      hideUnlinked: !c.display.unlinked,
      visible,
    })
    const layout = new Map<string, { x: number; y: number }>()
    for (const [id, [x, y]] of Object.entries(s.matrixPositions)) layout.set(id, { x, y })
    for (const n of this.graph.nodes) layout.set(n.id, { x: n.x, y: n.y })
    const fresh = place(graph, layout)
    const settleAll = fresh.size === graph.nodes.length
    const prev = this.sim
    // A local settle's moving set is carried too, or a push mid-settle would jiggle the whole picture at the local wake's heat.
    const moving = prev?.local ? prev.graph.nodes.filter((n) => !n.pinned).map((n) => n.id) : null
    this.graph = graph
    this.sim = createSimulation(graph, c.forces, settleAll)
    if (prev) this.sim.held = prev.held
    else for (const [id, p] of Object.entries(s.matrixPositions)) if (p[2]) this.sim.held.add(id)
    for (const id of this.sim.held) {
      const i = graph.index.get(id)
      if (i !== undefined) graph.nodes[i].pinned = true
    }
    if (prev?.awake && !settleAll) {
      if (moving) wakeLocal(this.sim, new Set([...moving, ...fresh]))
      this.sim.awake = true
      this.sim.alpha = prev.alpha
      this.sim.alphaTarget = prev.alphaTarget
    } else if (!settleAll && fresh.size > 0) wakeLocal(this.sim, fresh)
    const dragged = this.draggingIndex()
    if (dragged >= 0) {
      reheat(this.sim)
      graph.nodes[dragged].pinned = true
    }
    if (first) {
      this.viewport = s.matrixViewport ?? this.viewport
      // A first-ever open fits the settled picture, not the spiral: the fit waits for the first settle when no viewport was persisted.
      this.fitOnSettle = s.matrixViewport === null
      if (this.fitOnSettle && !this.sim.awake) this.fitNow()
    }
    this.schedule()
  }

  // The stage has no size until the surface's first measure; the fit waits for it rather than spending itself on a zero box.
  private fitNow(): void {
    if (this.stage.width === 0) return
    this.fitOnSettle = false
    this.setViewport(this.fitted())
  }

  private flushViewport(): void {
    if (this.save === null) return
    clearTimeout(this.save)
    this.save = null
    useSession.getState().saveMatrixViewport(this.viewport)
  }

  private fitted(): Viewport {
    const { nodes } = this.graph
    if (nodes.length === 0 || this.stage.width === 0) return this.viewport
    let x0 = Number.POSITIVE_INFINITY
    let y0 = x0
    let x1 = Number.NEGATIVE_INFINITY
    let y1 = x1
    for (const n of nodes) {
      x0 = Math.min(x0, n.x - n.radius)
      y0 = Math.min(y0, n.y - n.radius)
      x1 = Math.max(x1, n.x + n.radius)
      y1 = Math.max(y1, n.y + n.radius)
    }
    return fit({ x0, y0, x1, y1 }, this.stage)
  }

  private get visible(): boolean {
    for (const s of this.surfaces) if (s.visible()) return true
    return false
  }

  private schedule(): void {
    if (this.frame || !this.visible) return
    this.frame = requestAnimationFrame(() => {
      this.frame = 0
      this.step()
    })
  }

  private step(): void {
    const sim = this.sim
    const awake = sim ? tick(sim) : false
    for (const fn of this.listeners) fn()
    if (this.wasAwake && !awake) this.settled()
    this.wasAwake = awake
    if (awake || this.animating()) this.schedule()
  }

  private settled(): void {
    if (this.fitOnSettle) this.fitNow()
    const held = this.sim?.held
    const positions: Positions = {}
    for (const n of this.graph.nodes) positions[n.id] = held?.has(n.id) ? [n.x, n.y, 1] : [n.x, n.y]
    useSession.getState().saveMatrixLayout(positions)
  }

  private animating(): boolean {
    return this.ghosts.length > 0 || this.arrivals.size > 0
  }

  // Any surface change that needs a paint but no physics: hover, viewport, a label move.
  invalidate(): void {
    if (this.frame || !this.visible) return
    this.frame = requestAnimationFrame(() => {
      this.frame = 0
      if (this.sim?.awake || this.animating()) this.step()
      else for (const fn of this.listeners) fn()
    })
  }

  // The world point under the stage's centre stays there, so a pane sliding in pans the picture on the pane's own motion.
  setStage(next: Stage): void {
    const was = this.stage
    this.stage = next
    if (was.width === 0) {
      if (this.fitOnSettle && this.sim && !this.sim.awake) this.fitNow()
      return
    }
    const dx = next.x + next.width / 2 - (was.x + was.width / 2)
    const dy = next.y + next.height / 2 - (was.y + was.height / 2)
    if (dx !== 0 || dy !== 0) this.setViewport(panBy(this.viewport, dx, dy))
  }

  hitTest(wx: number, wy: number): number {
    if (!this.sim) return -1
    const n = nodeAt(this.sim, wx, wy, HIT_SLACK)
    return n ? (this.graph.index.get(n.id) ?? -1) : -1
  }

  hoveredIndex(): number {
    return this.hoveredId === null ? -1 : (this.graph.index.get(this.hoveredId) ?? -1)
  }

  draggingIndex(): number {
    return this.draggingId === null ? -1 : (this.graph.index.get(this.draggingId) ?? -1)
  }

  setHovered(i: number): void {
    const id = this.graph.nodes[i]?.id ?? null
    if (this.hoveredId === id) return
    this.hoveredId = id
    this.invalidate()
  }

  setViewport(v: Viewport): void {
    if (v === this.viewport) return
    this.viewport = v
    if (this.save !== null) clearTimeout(this.save)
    this.save = setTimeout(() => {
      this.save = null
      useSession.getState().saveMatrixViewport(this.viewport)
    }, VIEWPORT_SAVE_MS)
    this.invalidate()
  }

  beginDrag(i: number): void {
    const n = this.graph.nodes[i]
    if (!n || !this.sim || this.built?.display.locked) return
    this.draggingId = n.id
    reheat(this.sim)
    n.pinned = true
    this.schedule()
  }

  moveDrag(wx: number, wy: number): void {
    const n = this.graph.nodes[this.draggingIndex()]
    if (!n) return
    n.x = wx
    n.y = wy
    n.vx = n.vy = 0
    this.invalidate()
  }

  endDrag(): void {
    if (this.draggingId === null) return
    this.sim?.held.add(this.draggingId)
    this.draggingId = null
    if (this.sim) cool(this.sim)
    this.schedule()
  }

  shuffle(): void {
    if (!this.sim) return
    shuffle(this.sim)
    this.schedule()
  }

  setForces(forces: Forces): void {
    if (!this.sim) return
    this.sim.forces = forces
    reheat(this.sim)
    cool(this.sim)
    this.schedule()
  }
}

export const matrixRuntime = new MatrixRuntime()
