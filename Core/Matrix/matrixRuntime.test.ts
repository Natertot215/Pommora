// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fail, ok } from '../Contract/result'
import { useSession } from '../Session/store'
import { makeTree } from '../Testing/testTree'
import { stubDialer } from '../vitest.setup'
import type { Stage } from './Engine/viewport'
import { applyPatch, DEFAULT_MATRIX_CONFIG, type MatrixConfig } from './matrixConfig'
import { EMPTY_GRAPH_REPLY, type MatrixGraphReply, type MatrixLink } from './matrixGraph'
import { matrixRuntime, type Surface } from './matrixRuntime'

const walks = vi.hoisted(() => ({ count: 0 }))
vi.mock('./matrixInput', async (actual) => {
  const real = await actual<typeof import('./matrixInput')>()
  return {
    ...real,
    matrixWalk: (...args: Parameters<typeof real.matrixWalk>) => {
      walks.count += 1
      return real.matrixWalk(...args)
    },
  }
})

const STAGE: Stage = { x: 0, y: 0, width: 800, height: 600 }

const centreOf = (v: { x: number; y: number; zoom: number }, st: Stage): [number, number] => [
  v.x + (st.x + st.width / 2) / v.zoom,
  v.y + (st.y + st.height / 2) / v.zoom,
]

const link = (pageId: string, target: string): MatrixLink => ({
  pageId,
  path: `${pageId}.md`,
  kind: 'body',
  target,
  qualifier: '',
  count: 1,
})

const linked = (): MatrixGraphReply => ({ links: [link('p2', 'Alpha')], values: {} })

let frames: Array<() => void> = []
let saveLayout: ReturnType<typeof vi.fn>
let saveFrame: ReturnType<typeof vi.fn>
let detach: (() => void) | null = null
let visible = true

const step = (): void => {
  const queued = frames
  frames = []
  for (const fn of queued) fn()
}

const flush = (limit = 5000): void => {
  let n = 0
  while (frames.length > 0 && n++ < limit) step()
}

const config = (over: Partial<MatrixConfig['display']> = {}): MatrixConfig =>
  applyPatch(DEFAULT_MATRIX_CONFIG, { display: over })

const relocated = () => {
  const moved = makeTree()
  const [page] = moved.collections[0].sets[0].pages
  moved.collections[0].sets[0].pages = []
  moved.collections[0].pages.push({ ...page, path: 'Notes/Beta.md' })
  return moved
}

const without = (id: string) => {
  const t = makeTree()
  for (const c of t.collections) {
    c.pages = c.pages.filter((p) => p.id !== id)
    for (const set of c.sets) set.pages = set.pages.filter((p) => p.id !== id)
  }
  return t
}

const placeOf = (id: string): number[] => {
  const n = matrixRuntime.nodeOf(id)
  return n ? [n.x, n.y] : []
}

function seed(over: Record<string, unknown> = {}): void {
  saveLayout = vi.fn()
  saveFrame = vi.fn()
  useSession.setState({
    tree: makeTree(),
    matrixConfig: DEFAULT_MATRIX_CONFIG,
    matrixGraph: EMPTY_GRAPH_REPLY,
    matrixPositions: {},
    matrixFrame: { cx: 0, cy: 0, w: 800, h: 600 },
    matrixLoaded: true,
    saveMatrixLayout: saveLayout as never,
    saveMatrixFrame: saveFrame as never,
    ...over,
  } as never)
}

let surface: Surface = { visible: () => visible }

const attach = (stage: Stage | null = STAGE): void => {
  surface = { visible: () => visible }
  detach = matrixRuntime.attach(surface)
  if (stage) matrixRuntime.setStage(surface, stage)
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  walks.count = 0
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'matrix:write': async () => ok(null),
    'matrixLayout:save': async () => ok(null),
  })
  visible = true
  vi.stubGlobal('requestAnimationFrame', (fn: () => void) => frames.push(fn))
  matrixRuntime.setFrame({ cx: 0, cy: 0, w: STAGE.width, h: STAGE.height })
  // Drained rather than dropped: a queued frame left standing keeps the runtime's own frame handle set, and every later schedule is a no-op.
  flush()
  vi.runAllTimers()
})

afterEach(() => {
  detach?.()
  detach = null
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('matrixRuntime', () => {
  it('ticks a fresh graph to sleep and writes every position exactly once', () => {
    seed()
    attach()
    expect(matrixRuntime.graph.nodes).toHaveLength(2)
    expect(matrixRuntime.sim?.awake).toBe(true)
    flush()
    expect(matrixRuntime.sim?.awake).toBe(false)
    expect(saveLayout).toHaveBeenCalledTimes(1)
    expect(Object.keys(saveLayout.mock.calls[0][0]).sort()).toEqual(['p1', 'p2'])
    matrixRuntime.resume()
    flush()
    expect(saveLayout).toHaveBeenCalledTimes(1)
  })

  it('never ticks while hidden and finishes the settle on resume', () => {
    visible = false
    seed()
    attach()
    expect(frames).toHaveLength(0)
    flush()
    expect(saveLayout).not.toHaveBeenCalled()
    visible = true
    matrixRuntime.resume()
    flush()
    expect(matrixRuntime.sim?.awake).toBe(false)
    expect(saveLayout).toHaveBeenCalledTimes(1)
  })

  it('writes the positions once when the last surface detaches mid-settle', () => {
    seed()
    attach()
    step()
    expect(matrixRuntime.sim?.awake).toBe(true)
    detach?.()
    detach = null
    expect(saveLayout).toHaveBeenCalledTimes(1)
    expect(matrixRuntime.graph.nodes).toHaveLength(0)
  })

  it('writes the positions when a surface leaves and the one still attached cannot tick', () => {
    seed()
    attach()
    const parked: Surface = { visible: () => false }
    const detachParked = matrixRuntime.attach(parked)
    step()
    expect(matrixRuntime.sim?.awake).toBe(true)
    detach?.()
    detach = null
    expect(saveLayout).toHaveBeenCalledTimes(1)
    expect(matrixRuntime.graph.nodes).not.toHaveLength(0)
    detachParked()
  })

  it('approaches the pointer through its springs rather than tracking it', () => {
    seed()
    attach()
    flush()
    const n = matrixRuntime.graph.nodes[0]
    const from = [n.x, n.y]
    matrixRuntime.beginDrag(0)
    expect(n.pinned).toBe(false)
    matrixRuntime.moveDrag(from[0] + 400, from[1])
    step()
    const first = n.x
    expect(first).toBeGreaterThan(from[0])
    expect(first).toBeLessThan(from[0] + 400)
    for (let i = 0; i < 40; i++) step()
    expect(n.x).toBeGreaterThan(first)
    expect(n.x).toBeLessThan(from[0] + 400)
  })

  it('lets a dropped node go where the springs have it, without returning it', () => {
    seed()
    attach()
    flush()
    const n = matrixRuntime.graph.nodes[0]
    const from = [n.x, n.y]
    matrixRuntime.beginDrag(0)
    matrixRuntime.moveDrag(from[0] + 300, from[1] + 200)
    for (let i = 0; i < 30; i++) step()
    const carried = Math.hypot(n.x - from[0], n.y - from[1])
    expect(carried).toBeGreaterThan(1)
    matrixRuntime.endDrag()
    expect(matrixRuntime.sim?.drag).toBeNull()
    flush()
    expect(matrixRuntime.sim?.awake).toBe(false)
    expect(n.pinned).toBe(false)
    expect(Math.hypot(n.x - from[0], n.y - from[1])).toBeGreaterThan(carried / 4)
    expect(saveLayout.mock.lastCall?.[0][n.id]).toHaveLength(2)
  })

  it('redraws on a Groups pick, where every node already has a place', () => {
    seed({ matrixPositions: { p1: [0, 0], p2: [60, 0] } })
    attach()
    flush()
    const before = [placeOf('p1'), placeOf('p2')]
    useSession.getState().patchMatrix({ group: { mode: 'location' } })
    expect(matrixRuntime.sim?.awake).toBe(true)
    flush()
    expect([placeOf('p1'), placeOf('p2')]).not.toEqual(before)
  })

  it('ends a drag whose node the rebuild lost, so the loop can sleep', () => {
    seed()
    attach()
    flush()
    matrixRuntime.beginDrag(matrixRuntime.indexOf('p1'))
    matrixRuntime.moveDrag(400, 0)
    step()
    expect(matrixRuntime.sim?.alphaTarget).toBeGreaterThan(0)
    useSession.setState({ tree: without('p1') } as never)
    expect(matrixRuntime.draggingId).toBeNull()
    expect(matrixRuntime.sim?.drag).toBeNull()
    expect(matrixRuntime.sim?.alphaTarget).toBe(0)
    flush()
    expect(matrixRuntime.sim?.awake).toBe(false)
  })

  it('carries a drag across a rebuild, and the node keeps following the pointer', () => {
    seed()
    attach()
    flush()
    const id = matrixRuntime.graph.nodes[0].id
    matrixRuntime.beginDrag(0)
    matrixRuntime.moveDrag(400, 0)
    for (let i = 0; i < 10; i++) step()
    useSession.setState({ matrixGraph: { links: [], values: {} } })
    expect(matrixRuntime.draggingId).toBe(id)
    expect(matrixRuntime.sim?.drag?.id).toBe(id)
    const carried = placeOf(id)[0]
    matrixRuntime.moveDrag(900, 0)
    for (let i = 0; i < 20; i++) step()
    expect(placeOf(id)[0]).toBeGreaterThan(carried)
  })

  it('carries an in-flight settle across a rebuild and settles once', () => {
    seed()
    attach()
    step()
    step()
    const alpha = matrixRuntime.sim?.alpha ?? 0
    expect(alpha).toBeLessThan(1)
    useSession.setState({ matrixGraph: { links: [], values: {} } })
    expect(matrixRuntime.sim?.awake).toBe(true)
    expect(matrixRuntime.sim?.alpha).toBe(alpha)
    flush()
    expect(saveLayout).toHaveBeenCalledTimes(1)
  })

  it('fits the graph to the stage on the first settle when nothing was persisted', () => {
    seed({ matrixFrame: null })
    attach()
    flush()
    vi.runAllTimers()
    expect(saveFrame).toHaveBeenCalledTimes(1)
    expect(saveFrame.mock.calls[0][0]).toEqual(matrixRuntime.frame)
    expect(matrixRuntime.frame).not.toEqual({ cx: 0, cy: 0, w: 800, h: 600 })
  })

  it('fits a first open that carries positions once its settle lands', () => {
    matrixRuntime.setFrame({ cx: 0, cy: 0, w: STAGE.width, h: STAGE.height })
    vi.runAllTimers()
    seed({ matrixFrame: null, matrixPositions: { p1: [0, 0], p2: [60, 0] } })
    attach(null)
    flush()
    expect(saveFrame).not.toHaveBeenCalled()
    matrixRuntime.setStage(surface, STAGE)
    vi.runAllTimers()
    expect(saveFrame).toHaveBeenCalledTimes(1)
    expect(matrixRuntime.frame).not.toEqual({ cx: 0, cy: 0, w: 800, h: 600 })
  })

  it('writes one frame for a pan, and the last surface flushes it as it leaves', () => {
    seed()
    attach()
    flush()
    saveFrame.mockClear()
    matrixRuntime.setFrame({ cx: 10, cy: 0, w: STAGE.width, h: STAGE.height })
    matrixRuntime.setFrame({ cx: 20, cy: 0, w: STAGE.width, h: STAGE.height })
    expect(saveFrame).not.toHaveBeenCalled()
    detach?.()
    detach = null
    expect(saveFrame).toHaveBeenCalledTimes(1)
    expect(saveFrame.mock.calls[0][0]).toEqual({ cx: 20, cy: 0, w: STAGE.width, h: STAGE.height })
    vi.runAllTimers()
    expect(saveFrame).toHaveBeenCalledTimes(1)
  })

  it('walks the tree once for a filter patch and rebuilds the graph from the cache', () => {
    seed({ matrixGraph: linked() })
    attach()
    flush()
    expect(walks.count).toBe(1)
    useSession.setState({
      matrixConfig: applyPatch(DEFAULT_MATRIX_CONFIG, {
        filter: {
          rules: {
            match: 'all' as const,
            rules: [{ property_id: '_location', op: 'is_inside', value: 's1' }],
          },
          enabled: true,
        },
      }),
    })
    expect(walks.count).toBe(1)
    expect(matrixRuntime.graph.nodes).toHaveLength(1)
  })

  it('seats every stored position unpinned and writes back a bare pair', () => {
    seed({ matrixPositions: { p1: [0, 0], p2: [60, 0] } })
    attach()
    const at = (id: string) => matrixRuntime.nodeOf(id)
    expect([at('p1')?.pinned, at('p2')?.pinned]).toEqual([false, false])
    matrixRuntime.shuffle()
    flush()
    expect(saveLayout.mock.lastCall?.[0].p1).toHaveLength(2)
  })

  it('eases the live simulation on a forces-only patch', () => {
    seed()
    attach()
    flush()
    const sim = matrixRuntime.sim
    useSession.setState({
      matrixConfig: applyPatch(DEFAULT_MATRIX_CONFIG, { forces: { gravity: 2 } }),
    })
    expect(matrixRuntime.sim).toBe(sim)
    expect(matrixRuntime.sim?.forces.gravity).toBe(2)
    expect(matrixRuntime.sim?.awake).toBe(true)
  })

  it('repaints on a label or lock patch and rebuilds on an unlinked one', () => {
    seed({ matrixGraph: linked() })
    attach()
    flush()
    const graph = matrixRuntime.graph
    const sim = matrixRuntime.sim
    useSession.setState({ matrixConfig: config({ hideIcon: true }) })
    useSession.setState({ matrixConfig: config({ hideIcon: true, hidePath: true }) })
    useSession.setState({ matrixConfig: config({ hideIcon: true, locked: true }) })
    expect(matrixRuntime.graph).toBe(graph)
    expect(matrixRuntime.sim).toBe(sim)

    const before = graph.nodes.map((n) => [n.id, n.x, n.y] as const)
    useSession.setState({ matrixConfig: config({ unlinked: false }) })
    expect(matrixRuntime.graph).not.toBe(graph)
    for (const [id, x, y] of before) {
      const n = matrixRuntime.graph.nodes[matrixRuntime.graph.index.get(id) ?? -1]
      expect([n.x, n.y]).toEqual([x, y])
    }
  })

  it('pins nothing under a locked display', () => {
    seed({ matrixConfig: config({ locked: true }) })
    attach()
    flush()
    matrixRuntime.beginDrag(0)
    expect(matrixRuntime.draggingId).toBeNull()
    expect(matrixRuntime.graph.nodes[0].pinned).toBe(false)
    matrixRuntime.endDrag()
    expect(matrixRuntime.sim?.awake).toBe(false)
  })

  it('rebuilds on a group patch with every prior position kept', () => {
    seed()
    attach()
    flush()
    const before = matrixRuntime.graph.nodes.map((n) => [n.id, n.x, n.y] as const)
    useSession.setState({
      matrixConfig: applyPatch(DEFAULT_MATRIX_CONFIG, { group: { mode: 'location' } }),
    })
    expect(matrixRuntime.graph.nodes.length).toBeGreaterThan(before.length)
    for (const [id, x, y] of before) {
      const n = matrixRuntime.graph.nodes[matrixRuntime.graph.index.get(id) ?? -1]
      expect([n.x, n.y]).toEqual([x, y])
    }
  })

  it('clears the graph and asks the store to load once when the Nexus drops', async () => {
    const graphAsk = vi.fn(async () => fail('operation-failed', 'The index is not ready.'))
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'matrix:read': async () => ok(DEFAULT_MATRIX_CONFIG),
      'matrix:graph': graphAsk,
      'matrixLayout:load': async () => ok({ positions: {}, frame: null }),
    })
    seed()
    attach()
    flush()
    useSession.setState({ matrixLoaded: false })
    expect(matrixRuntime.graph.nodes).toHaveLength(0)
    expect(matrixRuntime.sim).toBeNull()
    useSession.setState({ matrixPositions: {} })
    await Promise.resolve()
    expect(graphAsk).toHaveBeenCalledTimes(1)
  })

  it('keeps a resized stage centred on the world point it already held', () => {
    seed()
    attach()
    flush()
    const held = centreOf(matrixRuntime.viewportOf(surface), STAGE)
    const moved: Stage = { ...STAGE, x: 100, width: STAGE.width - 100 }
    matrixRuntime.setStage(surface, moved)
    expect(centreOf(matrixRuntime.viewportOf(surface), moved)).toEqual(held)
    matrixRuntime.setStage(surface, STAGE)
  })

  it('shows one picture on every surface, each scaled to its own box', () => {
    seed()
    attach()
    flush()
    const held = centreOf(matrixRuntime.viewportOf(surface), STAGE)

    const small: Stage = { x: 0, y: 0, width: 400, height: 300 }
    const window: Surface = { visible: () => true }
    const detachWindow = matrixRuntime.attach(window)
    matrixRuntime.setStage(window, small)

    const wide = matrixRuntime.viewportOf(surface)
    const tight = matrixRuntime.viewportOf(window)
    expect(centreOf(tight, small)).toEqual(held)
    expect(centreOf(wide, STAGE)).toEqual(held)
    // The same picture at each surface's own scale: the smaller box draws it smaller, never crops it.
    expect(tight.zoom).toBeLessThan(wide.zoom)
    expect(small.width / tight.zoom).toBeCloseTo(STAGE.width / wide.zoom)

    detachWindow()
    expect(centreOf(matrixRuntime.viewportOf(surface), STAGE)).toEqual(held)
  })

  it('never moves the picture on the collapsing measure a surface reports as it is torn down', () => {
    seed()
    attach()
    flush()
    const before = matrixRuntime.frame
    matrixRuntime.setStage(surface, { x: 0, y: 0, width: 0, height: 0 })
    expect(matrixRuntime.frame).toEqual(before)
  })

  it('carries a local settle across a rebuild, moving only the fresh nodes', () => {
    seed({ matrixPositions: { p1: [0, 0], p2: [60, 0] } })
    attach()
    expect(matrixRuntime.sim?.awake).toBe(false)

    const grown = makeTree()
    grown.collections[0].pages.push({
      kind: 'page',
      id: 'p3',
      title: 'Gamma',
      path: 'Notes/Gamma.md',
    })
    useSession.setState({ tree: grown })
    const at = (id: string) => matrixRuntime.graph.nodes[matrixRuntime.graph.index.get(id) ?? -1]
    expect(matrixRuntime.sim?.local).toBe(true)
    expect([at('p1').pinned, at('p2').pinned, at('p3').pinned]).toEqual([true, true, false])

    useSession.setState({ matrixGraph: { links: [], values: {} } })
    expect(matrixRuntime.sim?.local).toBe(true)
    expect([at('p1').pinned, at('p2').pinned, at('p3').pinned]).toEqual([true, true, false])
  })

  it('defers a store change while every surface is hidden and rebuilds once on resume', () => {
    seed()
    attach()
    flush()
    const walked = walks.count
    visible = false
    useSession.setState({ tree: makeTree() })
    expect(walks.count).toBe(walked)
    visible = true
    matrixRuntime.resume()
    expect(walks.count).toBe(walked + 1)
    const graph = matrixRuntime.graph
    matrixRuntime.resume()
    expect(walks.count).toBe(walked + 1)
    expect(matrixRuntime.graph).toBe(graph)
  })

  it('drops a hover the rebuild lost, so the node comes back unhovered', () => {
    seed()
    attach()
    flush()
    matrixRuntime.setHovered(matrixRuntime.graph.index.get('p2') ?? -1)
    expect(matrixRuntime.hoveredIndex()).toBeGreaterThanOrEqual(0)
    const shrunk = makeTree()
    shrunk.collections[0].sets[0].pages = []
    useSession.setState({ tree: shrunk })
    expect(matrixRuntime.hoveredIndex()).toBe(-1)
    useSession.setState({ tree: makeTree() })
    expect(matrixRuntime.hoveredIndex()).toBe(-1)
  })

  it('wakes on a shuffle', () => {
    seed()
    attach()
    flush()
    expect(matrixRuntime.sim?.awake).toBe(false)
    matrixRuntime.shuffle()
    expect(matrixRuntime.sim?.awake).toBe(true)
  })

  it('fades a page out of its old folder and in beside the new one, in Location mode', () => {
    seed({
      matrixConfig: applyPatch(DEFAULT_MATRIX_CONFIG, { group: { mode: 'location' } }),
      matrixPositions: { p1: [0, 0], p2: [60, 0] },
    })
    attach()
    flush()
    const from = placeOf('p2')
    useSession.setState({ tree: relocated() })
    expect(matrixRuntime.ghosts).toHaveLength(1)
    expect([matrixRuntime.ghosts[0].x, matrixRuntime.ghosts[0].y]).toEqual(from)
    expect(matrixRuntime.arrivals.has('p2')).toBe(true)
    expect(placeOf('p2')).not.toEqual(from)
    expect(matrixRuntime.sim?.local).toBe(true)
    expect([matrixRuntime.nodeOf('p1')?.pinned, matrixRuntime.nodeOf('p2')?.pinned]).toEqual([
      true,
      false,
    ])
  })

  it('plays nothing for the same move in Connection mode', () => {
    seed({ matrixPositions: { p1: [0, 0], p2: [60, 0] } })
    attach()
    flush()
    const from = placeOf('p2')
    useSession.setState({ tree: relocated() })
    expect(matrixRuntime.ghosts).toHaveLength(0)
    expect(matrixRuntime.arrivals.size).toBe(0)
    expect(placeOf('p2')).toEqual(from)
  })
})
