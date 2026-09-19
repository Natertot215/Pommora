import { duration, ms } from '@pommora/uix/Animations/motion'
import { useSession } from '../Session/store'
import type { Forces } from './Engine/forces'
import { buildGraph, type Graph, type GraphNode } from './Engine/graph'
import { place } from './Engine/placement'
import {
  cool,
  createSimulation,
  nodeAt,
  reheat,
  resettle,
  shuffle,
  type Simulation,
  tick,
  wakeLocal,
} from './Engine/simulation'
import {
  DEFAULT_FRAME,
  fit,
  type Frame,
  framed,
  panFrame,
  type Stage,
  zoomFrame,
  type Viewport,
} from './Engine/viewport'
import type { MatrixConfig } from './matrixConfig'
import {
  matrixTree,
  matrixVisible,
  matrixWalk,
  type MatrixTree,
  type MatrixWalk,
} from './matrixInput'
import type { Positions } from './matrixLayout'

// KNOB — the hit slack past a node's edge, in world units.
const HIT_SLACK = 4
// KNOB — pans and zooms inside this window fold into one frame write.
const FRAME_SAVE_MS = 400
export const FADE_MS = ms(duration.base)

type Listener = () => void

export interface Surface {
  visible: () => boolean
}

const NO_STAGE: Stage = { x: 0, y: 0, width: 0, height: 0 }

interface Built {
  tree: unknown
  reply: unknown
  held: MatrixTree
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
  frame: Frame = DEFAULT_FRAME
  hoveredId: string | null = null
  acting: string | null = null
  private dragFrom: { id: string; x: number; y: number } | null = null
  ghosts: Array<{ x: number; y: number; radius: number; born: number }> = []
  arrivals = new Map<string, number>()
  private surfaces = new Set<Surface>()
  private stages = new Map<Surface, Stage>()
  private listeners = new Set<Listener>()
  private raf = 0
  private built: Built | null = null
  private wasAwake = false
  private fitOnSettle = false
  private dirty = false
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
      this.stages.delete(surface)
      if (this.surfaces.size === 0) {
        this.unsubscribe?.()
        this.unsubscribe = null
        if (this.sim?.awake) this.settled()
        this.clear()
      } else if (this.sim?.awake && !this.visible) this.settled()
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
    if (this.dirty) this.sync()
    this.schedule()
  }

  private clear(): void {
    this.flushFrame()
    this.frame = DEFAULT_FRAME
    this.built = null
    this.graph = EMPTY
    this.sim = null
    this.wasAwake = false
    this.fitOnSettle = false
    this.dirty = false
    this.hoveredId = null
    this.dragFrom = null
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
    if (!this.visible) {
      this.dirty = true
      return
    }
    this.dirty = false
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
    const held = b && b.tree === s.tree ? b.held : matrixTree(s.tree)
    const walk =
      b && b.held === held && b.reply === s.matrixGraph ? b.walk : matrixWalk(held, s.matrixGraph)
    const visible =
      b && b.walk === walk && b.filter === c.filter ? b.visible : matrixVisible(walk, c.filter)
    this.built = {
      tree: s.tree,
      reply: s.matrixGraph,
      held,
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
    // Only a fresh walk can have moved a page, and only Location mode draws containment.
    if (b && b.walk !== walk && c.group.mode === 'location') {
      const was = new Map(b.walk.input.pages.map((p) => [p.id, p.folderId]))
      const born = performance.now()
      for (const p of walk.input.pages) {
        const from = was.get(p.id)
        if (from === undefined || from === p.folderId) continue
        const n = this.nodeOf(p.id)
        if (n) this.ghosts.push({ x: n.x, y: n.y, radius: n.radius, born })
        layout.delete(p.id)
        this.arrivals.set(p.id, born)
      }
    }
    const fresh = place(graph, layout)
    const settleAll = fresh.size === graph.nodes.length
    const prev = this.sim
    // A local settle's moving set is carried too, or a push mid-settle would jiggle the whole picture at the local wake's heat.
    const moving = prev?.local ? prev.graph.nodes.filter((n) => !n.pinned).map((n) => n.id) : null
    this.graph = graph
    if (this.hoveredId !== null && !graph.index.has(this.hoveredId)) this.hoveredId = null
    const lostDrag = this.dragFrom !== null && !graph.index.has(this.dragFrom.id)
    if (lostDrag) this.dragFrom = null
    this.sim = createSimulation(graph, c.forces, settleAll)
    const carried = prev?.drag ?? null
    this.sim.drag = carried && graph.index.has(carried.id) ? carried : null
    if (prev?.awake && !settleAll) {
      if (moving) wakeLocal(this.sim, new Set([...moving, ...fresh]))
      this.sim.awake = true
      this.sim.alpha = prev.alpha
      this.sim.alphaTarget = prev.alphaTarget
    } else if (!settleAll && fresh.size > 0) wakeLocal(this.sim, fresh)
    if (b && b.group !== c.group) resettle(this.sim)
    if (lostDrag) cool(this.sim)
    if (this.dragFrom) reheat(this.sim)
    if (first) {
      this.frame = s.matrixFrame ?? this.frame
      // A first-ever open fits the settled picture, not the spiral: the fit waits for the first settle when nothing was persisted.
      this.fitOnSettle = s.matrixFrame === null
      if (this.fitOnSettle && !this.sim.awake) this.fitNow()
    }
    this.schedule()
  }

  // An empty graph has nothing to frame, so the fit stays owed until there is something to fit.
  private fitNow(): void {
    const next = this.fitted()
    if (next === null) return
    this.fitOnSettle = false
    this.setFrame(next)
  }

  private flushFrame(): void {
    if (this.save === null) return
    clearTimeout(this.save)
    this.save = null
    useSession.getState().saveMatrixFrame(this.frame)
  }

  private fitted(): Frame | null {
    const { nodes } = this.graph
    if (nodes.length === 0) return null
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
    return fit({ x0, y0, x1, y1 })
  }

  private get visible(): boolean {
    for (const s of this.surfaces) if (s.visible()) return true
    return false
  }

  private schedule(): void {
    if (this.raf || !this.visible) return
    this.raf = requestAnimationFrame(() => {
      this.raf = 0
      this.step()
    })
  }

  private step(): void {
    const sim = this.sim
    const awake = sim ? tick(sim) : false
    if (this.animating()) {
      const cutoff = performance.now() - FADE_MS
      this.ghosts = this.ghosts.filter((g) => g.born > cutoff)
      for (const [id, born] of this.arrivals) if (born <= cutoff) this.arrivals.delete(id)
    }
    for (const fn of this.listeners) fn()
    if (this.wasAwake && !awake) this.settled()
    this.wasAwake = awake
    if (awake || this.animating()) this.schedule()
  }

  private settled(): void {
    if (this.fitOnSettle) this.fitNow()
    const positions: Positions = {}
    for (const n of this.graph.nodes) positions[n.id] = [n.x, n.y]
    useSession.getState().saveMatrixLayout(positions)
  }

  private animating(): boolean {
    return this.ghosts.length > 0 || this.arrivals.size > 0
  }

  // Any surface change that needs a paint but no physics: hover, the frame, a label move.
  invalidate(): void {
    if (this.raf || !this.visible) return
    this.raf = requestAnimationFrame(() => {
      this.raf = 0
      if (this.sim?.awake || this.animating()) this.step()
      else for (const fn of this.listeners) fn()
    })
  }

  // Each surface fits the shared frame into its own box, so a stage that moves or resizes reframes only its own picture.
  setStage(surface: Surface, next: Stage): void {
    this.stages.set(surface, next)
  }

  private stageOf(surface: Surface): Stage {
    return this.stages.get(surface) ?? NO_STAGE
  }

  viewportOf(surface: Surface): Viewport {
    return framed(this.frame, this.stageOf(surface))
  }

  pan(surface: Surface, dx: number, dy: number): void {
    this.setFrame(panFrame(this.frame, this.stageOf(surface), dx, dy))
  }

  zoom(surface: Surface, sx: number, sy: number, factor: number): void {
    this.setFrame(zoomFrame(this.frame, this.stageOf(surface), sx, sy, factor))
  }

  indexOf(id: string | null): number {
    return id === null ? -1 : (this.graph.index.get(id) ?? -1)
  }

  nodeOf(id: string | null): GraphNode | undefined {
    return this.graph.nodes[this.indexOf(id)]
  }

  hitTest(wx: number, wy: number): number {
    if (!this.sim) return -1
    return this.indexOf(nodeAt(this.sim, wx, wy, HIT_SLACK)?.id ?? null)
  }

  hoveredIndex(): number {
    return this.indexOf(this.hoveredId)
  }

  get draggingId(): string | null {
    return this.dragFrom?.id ?? null
  }

  draggingIndex(): number {
    return this.indexOf(this.draggingId)
  }

  setHovered(i: number): void {
    const id = this.graph.nodes[i]?.id ?? null
    if (this.hoveredId === id) return
    this.hoveredId = id
    this.invalidate()
  }

  setFrame(f: Frame): void {
    if (f === this.frame) return
    this.frame = f
    if (this.save !== null) clearTimeout(this.save)
    this.save = setTimeout(() => {
      this.save = null
      useSession.getState().saveMatrixFrame(this.frame)
    }, FRAME_SAVE_MS)
    this.invalidate()
  }

  beginDrag(i: number): void {
    const n = this.graph.nodes[i]
    if (!n || !this.sim || this.built?.display.locked) return
    this.dragFrom = { id: n.id, x: n.x, y: n.y }
    this.sim.drag = { id: n.id, x: n.x, y: n.y }
    reheat(this.sim)
    this.schedule()
  }

  moveDrag(wx: number, wy: number): void {
    const drag = this.sim?.drag
    if (!drag) return
    drag.x = wx
    drag.y = wy
    this.invalidate()
  }

  // A drop and an abort are one ending: the node is let go where the springs have it and the layout relaxes around it.
  endDrag(): void {
    if (!this.dragFrom) return
    this.dragFrom = null
    if (this.sim) {
      this.sim.drag = null
      cool(this.sim)
    }
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
    cool(this.sim)
    this.schedule()
  }
}

export const matrixRuntime = new MatrixRuntime()
