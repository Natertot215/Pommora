import { duration, ms } from '@pommora/uix/Animations/motion'
import { emitter } from '@pommora/uix/Utilities/subscribable'
import type { NexusTree } from '../Nexus/tree'
import { useSession } from '../Session/store'
import type { Forces } from './Engine/forces'
import {
  buildGraph,
  type Graph,
  type GraphInput,
  type GraphNode,
  type GroupMode,
} from './Engine/graph'
import { place } from './Engine/placement'
import {
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
  fit,
  type Lens,
  lifeSize,
  panLens,
  type Stage,
  type Viewport,
  lensViewport,
  zoomLens,
} from './Engine/viewport'
import type { MatrixConfig } from './matrixConfig'
import { matrixConnections, matrixTree, matrixVisible, type MatrixTree } from './matrixInput'
import type { Positions } from './matrixLayout'
import { sameSet } from '@pommora/uix/Utilities/same'

// KNOB — the hit slack past a node's edge, in world units.
const HIT_SLACK = 4
export const FADE_MS = ms(duration.base)

export interface Surface {
  visible: () => boolean
}

const NO_STAGE: Stage = { x: 0, y: 0, width: 0, height: 0 }

// Each stage is kept on what it reads: the tree for the walk, the links for the connections, and the values only while a filter judges them.
interface Built {
  tree: NexusTree
  held: MatrixTree
  links: unknown
  connections: GraphInput['connections']
  values: unknown
  visible: ReadonlySet<string> | null
  group: unknown
  filter: unknown
  forces: MatrixConfig['forces']
  display: MatrixConfig['display']
}

const EMPTY: Graph = { nodes: [], links: [], index: new Map() }

class MatrixRuntime {
  graph: Graph = EMPTY
  mode: GroupMode = 'connection'
  sim: Simulation | null = null
  lens: Lens | null = null
  hoveredId: string | null = null
  acting: string | null = null
  ghosts: Array<{ x: number; y: number; radius: number; born: number }> = []
  arrivals = new Map<string, number>()
  private surfaces = new Set<Surface>()
  private stages = new Map<Surface, Stage>()
  private changes = emitter()
  readonly subscribe = this.changes.subscribe
  private raf = 0
  private built: Built | null = null
  private wasAwake = false
  private fitOnSettle = false
  private dirty = false
  private unsubscribe: (() => void) | null = null

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
        useSession.getState().unloadMatrix()
      } else if (this.sim?.awake && !this.visible) this.settled()
    }
  }

  resume(): void {
    if (this.dirty) this.sync()
    this.invalidate()
  }

  private clear(): void {
    this.lens = null
    this.built = null
    this.graph = EMPTY
    this.sim = null
    this.wasAwake = false
    this.fitOnSettle = false
    this.dirty = false
    this.hoveredId = null
    this.ghosts = []
    this.arrivals.clear()
  }

  private sync(): void {
    const s = useSession.getState()
    if (!s.tree) return
    if (s.matrixLoad.kind !== 'loaded') {
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
    const { links, values } = s.matrixGraph
    const b = this.built
    const held = matrixTree(s.tree)
    const connections =
      b && b.held === held && b.links === links ? b.connections : matrixConnections(s.tree, links)
    const judged =
      b &&
      b.held === held &&
      b.filter === c.filter &&
      b.values === values &&
      b.tree.config.registry === s.tree.config.registry &&
      b.tree.config.pageMetadata === s.tree.config.pageMetadata
        ? b.visible
        : matrixVisible(s.tree, values, c.filter)
    const visible = b?.visible && judged && sameSet(b.visible, judged) ? b.visible : judged
    this.built = {
      tree: s.tree,
      held,
      links,
      connections,
      values,
      visible,
      group: c.group,
      filter: c.filter,
      forces: c.forces,
      display: c.display,
    }
    // A save that moved no link and changed no filter verdict leaves the picture as it stands; a tree that moved under it only repaints, since the canvas draws icons and Space colors from the tree.
    if (
      b &&
      b.connections === connections &&
      b.visible === visible &&
      b.group === c.group &&
      b.display.unlinked === c.display.unlinked
    ) {
      // Only the active grouping's set reaches the simulation, so moving a slider for one the picture is not drawn under leaves it settled.
      const forces = c.forces[c.group.mode]
      if (b.forces[c.group.mode] !== forces) this.setForces(forces)
      if (b.display !== c.display || b.tree !== s.tree) this.invalidate()
      return
    }
    const first = b === null
    const graph = buildGraph(
      { pages: held.pages, folders: held.folders, spaces: held.spaces, connections },
      { mode: c.group.mode, hideUnlinked: !c.display.unlinked, visible },
    )
    const layout = new Map<string, { x: number; y: number }>()
    for (const [id, [x, y]] of Object.entries(s.matrixPositions)) layout.set(id, { x, y })
    for (const n of this.graph.nodes) layout.set(n.id, { x: n.x, y: n.y })
    // Only a new tree can have moved a page, and only Location mode draws containment.
    if (b && b.held !== held && c.group.mode === 'location') {
      const was = new Map(b.held.pages.map((p) => [p.id, p.folderId]))
      const born = performance.now()
      for (const p of held.pages) {
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
    this.mode = c.group.mode
    if (this.hoveredId !== null && !graph.index.has(this.hoveredId)) this.hoveredId = null
    this.sim = createSimulation(graph, c.forces[c.group.mode], settleAll)
    this.sim.drag = prev?.drag && graph.index.has(prev.drag.id) ? prev.drag : null
    if (prev?.awake && !settleAll) {
      if (moving) wakeLocal(this.sim, new Set([...moving, ...fresh]))
      this.sim.awake = true
      this.sim.alpha = prev.alpha
    } else if (!settleAll && fresh.size > 0) wakeLocal(this.sim, fresh)
    if (b && b.group !== c.group) resettle(this.sim)
    else if (b && b.forces[c.group.mode] !== c.forces[c.group.mode]) reheat(this.sim)
    if (first) {
      this.lens = s.matrixLens ?? this.lens
      // A first-ever open fits the settled picture, not the spiral: the fit waits for the first settle when nothing was persisted.
      this.fitOnSettle = s.matrixLens === null
      if (this.fitOnSettle && !this.sim.awake) this.fitNow()
    }
    this.invalidate()
  }

  // An empty graph has no extent, so the fit stays owed until there is something to fit.
  private fitNow(): void {
    const next = this.fitted()
    if (next === null) return
    this.fitOnSettle = false
    this.setLens(next)
  }

  private fitted(): Lens | null {
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

  // The one frame request: a step at rest only repaints, so hover, the lens, and a label move share it with the physics.
  invalidate(): void {
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
    this.changes.emit()
    if (this.wasAwake && !awake) this.settled()
    this.wasAwake = awake
    if (awake || this.animating()) this.invalidate()
  }

  private settled(): void {
    if (this.fitOnSettle) this.fitNow()
    const { matrixPositions: held, saveMatrixLayout } = useSession.getState()
    const moved: Positions = {}
    for (const n of this.graph.nodes) {
      const p = held[n.id]
      if (!p || p[0] !== n.x || p[1] !== n.y) moved[n.id] = [n.x, n.y]
    }
    saveMatrixLayout(moved)
  }

  private animating(): boolean {
    return this.ghosts.length > 0 || this.arrivals.size > 0
  }

  // Each surface fits the shared lens into its own box, so a stage that moves or resizes refits only its own picture. The first box to arrive is also what a lens is made from, so every lens past that carries a real extent.
  setStage(surface: Surface, next: Stage): void {
    this.stages.set(surface, next)
    if (this.lens === null && next.width > 0) this.lens = lifeSize(next)
    this.invalidate()
  }

  private stageOf(surface: Surface): Stage {
    return this.stages.get(surface) ?? NO_STAGE
  }

  viewportOf(surface: Surface): Viewport {
    const stage = this.stageOf(surface)
    return lensViewport(this.lens ?? lifeSize(stage), stage)
  }

  pan(surface: Surface, dx: number, dy: number): void {
    if (this.lens === null) return
    this.setLens(panLens(this.lens, this.stageOf(surface), dx, dy))
  }

  zoom(surface: Surface, sx: number, sy: number, factor: number): void {
    if (this.lens === null) return
    this.setLens(zoomLens(this.lens, this.stageOf(surface), sx, sy, factor))
  }

  indexOf(id: string | null): number {
    return id === null ? -1 : (this.graph.index.get(id) ?? -1)
  }

  nodeOf(id: string | null): GraphNode | undefined {
    return this.graph.nodes[this.indexOf(id)]
  }

  hitTest(wx: number, wy: number): string | null {
    return this.sim ? (nodeAt(this.sim, wx, wy, HIT_SLACK)?.id ?? null) : null
  }

  get draggingId(): string | null {
    return this.sim?.drag?.id ?? null
  }

  setHovered(node: string | null): void {
    const id = node !== null && this.graph.index.has(node) ? node : null
    if (this.hoveredId === id) return
    this.hoveredId = id
    this.invalidate()
  }

  setLens(lens: Lens): void {
    if (lens === this.lens) return
    this.lens = lens
    useSession.getState().saveMatrixLens(lens)
    this.invalidate()
  }

  beginDrag(id: string): void {
    const n = this.nodeOf(id)
    if (!n || !this.sim || this.built?.display.locked) return
    this.sim.drag = { id: n.id, x: n.x, y: n.y }
    reheat(this.sim)
    this.invalidate()
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
    if (!this.sim?.drag) return
    this.sim.drag = null
    this.invalidate()
  }

  shuffle(): void {
    if (!this.sim) return
    shuffle(this.sim)
    this.invalidate()
  }

  private setForces(forces: Forces): void {
    if (!this.sim) return
    this.sim.forces = forces
    reheat(this.sim)
    this.invalidate()
  }
}

export const matrixRuntime = new MatrixRuntime()
