// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ok } from '../Contract/result'
import { useSession } from '../Session/store'
import { makeTree } from '../Testing/testTree'
import { stubDialer } from '../vitest.setup'
import type { Stage } from './Engine/viewport'
import { applyPatch, DEFAULT_MATRIX_CONFIG, type MatrixConfig } from './matrixConfig'
import type { MatrixGraphReply, MatrixLink } from './matrixGraph'
import { matrixRuntime, type Surface } from './matrixRuntime'

const passes = vi.hoisted(() => ({ count: 0 }))
vi.mock('./matrixInput', async (actual) => {
  const real = await actual<typeof import('./matrixInput')>()
  return {
    ...real,
    matrixTree: (...args: Parameters<typeof real.matrixTree>) => {
      passes.count += 1
      return real.matrixTree(...args)
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
})

const linked = (): MatrixGraphReply => ({ links: [link('p2', 'Alpha')], values: {} })

let frames: Array<() => void> = []
let saveLayout: ReturnType<typeof vi.fn>
let saveLens: ReturnType<typeof vi.fn>
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
  useSession.setState({
    tree: makeTree(),
    matrixConfig: DEFAULT_MATRIX_CONFIG,
    matrixGraph: { links: [], values: {} },
    matrixPositions: {},
    matrixLens: { cx: 0, cy: 0, w: 800, h: 600 },
    matrixLoad: { kind: 'loaded' },
    saveMatrixLayout: saveLayout as never,
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
  passes.count = 0
  saveLens = vi.fn(async () => ok(null))
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'matrix:write': async () => ok(null),
    'matrixLayout:save': saveLens,
  })
  visible = true
  vi.stubGlobal('requestAnimationFrame', (fn: () => void) => frames.push(fn))
  matrixRuntime.setLens({ cx: 0, cy: 0, w: STAGE.width, h: STAGE.height })
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
    matrixRuntime.beginDrag(matrixRuntime.graph.nodes[0].id)
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
    matrixRuntime.beginDrag(matrixRuntime.graph.nodes[0].id)
    matrixRuntime.moveDrag(from[0] + 300, from[1] + 200)
    for (let i = 0; i < 30; i++) step()
    const carried = Math.hypot(n.x - from[0], n.y - from[1])
    expect(carried).toBeGreaterThan(1)
    matrixRuntime.endDrag()
    expect(matrixRuntime.sim?.drag).toBeNull()
    flush()
    expect(matrixRuntime.sim?.awake).toBe(false)
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
    matrixRuntime.beginDrag('p1')
    matrixRuntime.moveDrag(400, 0)
    step()
    useSession.setState({ tree: without('p1') } as never)
    expect(matrixRuntime.draggingId).toBeNull()
    flush()
    expect(matrixRuntime.sim?.awake).toBe(false)
  })

  it('carries a drag across a rebuild, and the node keeps following the pointer', () => {
    seed()
    attach()
    flush()
    const id = matrixRuntime.graph.nodes[0].id
    matrixRuntime.beginDrag(matrixRuntime.graph.nodes[0].id)
    matrixRuntime.moveDrag(400, 0)
    for (let i = 0; i < 10; i++) step()
    useSession.setState({ matrixGraph: { links: [], values: {} } })
    expect(matrixRuntime.draggingId).toBe(id)
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
    seed({ matrixLens: null })
    attach()
    flush()
    vi.runAllTimers()
    expect(saveLens).toHaveBeenCalledTimes(1)
    expect(saveLens.mock.calls[0][0]).toEqual({ lens: matrixRuntime.lens })
    expect(matrixRuntime.lens).not.toEqual({ cx: 0, cy: 0, w: 800, h: 600 })
  })

  it('fits a first open that carries positions once its settle lands', async () => {
    seed({ matrixLens: null, matrixPositions: { p1: [0, 0], p2: [60, 0] } })
    attach(null)
    flush()
    matrixRuntime.setStage(surface, STAGE)
    await vi.runAllTimersAsync()
    expect(saveLens).toHaveBeenCalledTimes(1)
    expect(matrixRuntime.lens).not.toEqual({ cx: 0, cy: 0, w: 800, h: 600 })
  })

  it('rebuilds the graph for a filter patch', () => {
    seed({ matrixGraph: linked() })
    attach()
    flush()
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
    expect(matrixRuntime.graph.nodes).toHaveLength(1)
  })

  it('eases the live simulation on a forces-only patch', () => {
    seed()
    attach()
    flush()
    const sim = matrixRuntime.sim
    useSession.setState({
      matrixConfig: applyPatch(DEFAULT_MATRIX_CONFIG, {
        forces: { connection: { ...DEFAULT_MATRIX_CONFIG.forces.connection, gravity: 2 } },
      }),
    })
    expect(matrixRuntime.sim).toBe(sim)
    expect(matrixRuntime.sim?.forces.gravity).toBe(2)
    expect(matrixRuntime.sim?.awake).toBe(true)
  })

  it('leaves the simulation settled when a grouping it is not drawn under is tuned', () => {
    seed()
    attach()
    flush()
    const sim = matrixRuntime.sim
    const forces = matrixRuntime.sim?.forces
    const held = DEFAULT_MATRIX_CONFIG.forces
    useSession.getState().applyMatrixChanged({
      ...DEFAULT_MATRIX_CONFIG,
      forces: {
        connection: { ...held.connection },
        location: { ...held.location },
        space: { ...held.space, gravity: 2 },
      },
    })
    expect(matrixRuntime.sim).toBe(sim)
    expect(matrixRuntime.sim?.forces).toBe(forces)
    expect(matrixRuntime.sim?.awake).toBe(false)
  })

  it('carries each grouping onto its own forces as the mode switches', () => {
    seed()
    attach()
    flush()
    const held = DEFAULT_MATRIX_CONFIG.forces
    const tuned: MatrixConfig = {
      ...DEFAULT_MATRIX_CONFIG,
      forces: {
        connection: { ...held.connection, gravity: 0.5 },
        location: { ...held.location, gravity: 1.5 },
        space: { ...held.space, gravity: 2 },
      },
    }
    useSession.setState({ matrixConfig: tuned })
    expect(matrixRuntime.sim?.forces.gravity).toBe(0.5)
    useSession.setState({ matrixConfig: applyPatch(tuned, { group: { mode: 'space' } }) })
    expect(matrixRuntime.sim?.forces.gravity).toBe(2)
    useSession.setState({ matrixConfig: applyPatch(tuned, { group: { mode: 'location' } }) })
    expect(matrixRuntime.sim?.forces.gravity).toBe(1.5)
  })

  it('repaints on a label or lock patch and rebuilds on an unlinked one', () => {
    seed({ matrixGraph: linked() })
    attach()
    flush()
    const graph = matrixRuntime.graph
    const sim = matrixRuntime.sim
    const paint = vi.fn()
    const stop = matrixRuntime.subscribe(paint)
    useSession.setState({ matrixConfig: config({ hideIcon: true }) })
    useSession.setState({ matrixConfig: config({ hideIcon: true, hidePath: true }) })
    useSession.setState({ matrixConfig: config({ hideIcon: true, locked: true }) })
    step()
    stop()
    expect(paint).toHaveBeenCalledTimes(1)
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

  it('starts no drag under a locked display', () => {
    seed({ matrixConfig: config({ locked: true }) })
    attach()
    flush()
    matrixRuntime.beginDrag(matrixRuntime.graph.nodes[0].id)
    expect(matrixRuntime.draggingId).toBeNull()
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

  it('lets the store unload its graph once the last surface closes', () => {
    seed({ matrixGraph: linked() })
    attach()
    flush()
    const second = { visible: () => true }
    const detachSecond = matrixRuntime.attach(second)
    detachSecond()
    expect(useSession.getState().matrixLoad.kind).toBe('loaded')
    detach?.()
    detach = null
    expect(useSession.getState().matrixLoad.kind).toBe('unloaded')
    expect(useSession.getState().matrixGraph).toEqual({ links: [], values: {} })
  })

  // Every lens is made from a box, so a gesture before the first fit moves a real picture rather than scaling an empty one.
  it('takes its first lens from the first stage that has a size', () => {
    seed()
    attach()
    flush()
    detach?.()
    detach = null
    expect(matrixRuntime.lens).toBeNull()

    matrixRuntime.setStage(surface, { ...STAGE, width: 0, height: 0 })
    expect(matrixRuntime.lens).toBeNull()

    matrixRuntime.setStage(surface, STAGE)
    expect(matrixRuntime.lens).toEqual({ cx: 0, cy: 0, w: STAGE.width, h: STAGE.height })
    expect(matrixRuntime.viewportOf(surface).zoom).toBe(1)
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

  it('saves only the nodes a settle moved', () => {
    seed({ matrixPositions: { p1: [0, 0], p2: [60, 0] } })
    attach()
    const grown = makeTree()
    grown.collections[0].pages.push({
      kind: 'page',
      id: 'p3',
      title: 'Gamma',
      path: 'Notes/Gamma.md',
    })
    useSession.setState({ tree: grown })
    flush()
    expect(saveLayout).toHaveBeenCalledTimes(1)
    expect(Object.keys(saveLayout.mock.calls[0][0])).toEqual(['p3'])
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

  it('reads nothing for a store write it does not draw from', () => {
    seed()
    attach()
    flush()
    const passed = passes.count
    useSession.setState({ headings: { 'Notes/Alpha.md': ['intro'] } })
    expect(passes.count).toBe(passed)
  })

  it('defers a store change while every surface is hidden and rebuilds once on resume', () => {
    seed()
    attach()
    flush()
    const passed = passes.count
    visible = false
    useSession.setState({ tree: makeTree() })
    expect(passes.count).toBe(passed)
    visible = true
    matrixRuntime.resume()
    expect(passes.count).toBe(passed + 1)
    const graph = matrixRuntime.graph
    matrixRuntime.resume()
    expect(passes.count).toBe(passed + 1)
    expect(matrixRuntime.graph).toBe(graph)
  })

  it('drops a hover the rebuild lost, so the node comes back unhovered', () => {
    seed()
    attach()
    flush()
    matrixRuntime.setHovered('p2')
    expect(matrixRuntime.hoveredId).toBe('p2')
    const shrunk = makeTree()
    shrunk.collections[0].sets[0].pages = []
    useSession.setState({ tree: shrunk })
    expect(matrixRuntime.hoveredId).toBeNull()
    useSession.setState({ tree: makeTree() })
    expect(matrixRuntime.hoveredId).toBeNull()
  })

  it('leaves the picture standing for a refetch that moved no link', () => {
    const reply = linked()
    seed({ matrixGraph: reply })
    attach()
    flush()
    const graph = matrixRuntime.graph
    const sim = matrixRuntime.sim
    useSession.setState({ matrixGraph: { links: reply.links, values: {} } })
    expect(matrixRuntime.graph).toBe(graph)
    expect(matrixRuntime.sim).toBe(sim)
  })

  it('leaves a filtered picture standing for a refetch that changed no verdict', () => {
    const reply = linked()
    seed({
      matrixGraph: reply,
      matrixConfig: applyPatch(DEFAULT_MATRIX_CONFIG, {
        filter: {
          rules: {
            match: 'all' as const,
            rules: [{ property_id: '_location', op: 'is_inside', value: 'c1' }],
          },
          enabled: true,
        },
      }),
    })
    attach()
    flush()
    const graph = matrixRuntime.graph
    useSession.setState({
      matrixGraph: {
        links: reply.links,
        values: { p2: { frontmatter: { ID: 'p2' }, createdAt: null, modifiedAt: 'later' } },
      },
    })
    expect(matrixRuntime.graph).toBe(graph)
  })

  it('re-judges a filter when a value it reads arrives', () => {
    const tree = makeTree()
    tree.config.registry = [{ id: 'prop_rank', name: 'Rank', type: 'number' }]
    const reply = linked()
    seed({
      tree,
      matrixGraph: reply,
      matrixConfig: applyPatch(DEFAULT_MATRIX_CONFIG, {
        filter: {
          rules: { match: 'all' as const, rules: [{ property_id: 'prop_rank', op: 'is_empty' }] },
          enabled: true,
        },
      }),
    })
    attach()
    flush()
    expect(matrixRuntime.graph.index.has('p1')).toBe(true)
    useSession.setState({
      matrixGraph: {
        links: reply.links,
        values: { p1: { frontmatter: { ID: 'p1', Rank: 3 }, createdAt: null, modifiedAt: null } },
      },
    })
    expect(matrixRuntime.graph.index.has('p1')).toBe(false)
  })

  it('keeps the simulation and repaints for a tree change that moves no node or link', () => {
    const tree = makeTree()
    seed({ tree, matrixGraph: linked() })
    attach()
    flush()
    const sim = matrixRuntime.sim
    const paint = vi.fn()
    const stop = matrixRuntime.subscribe(paint)
    useSession.setState({
      tree: { ...tree, config: { ...tree.config, pageMetadata: { p1: { icon: 'star' } } } },
    })
    step()
    stop()
    expect(matrixRuntime.sim).toBe(sim)
    expect(paint).toHaveBeenCalledTimes(1)
  })

  it('re-judges a filter when the registry defines the property it reads', () => {
    const tree = makeTree()
    seed({
      tree,
      matrixGraph: {
        links: [],
        values: { p1: { frontmatter: { ID: 'p1', Rank: 3 }, createdAt: null, modifiedAt: null } },
      },
      matrixConfig: applyPatch(DEFAULT_MATRIX_CONFIG, {
        filter: {
          rules: { match: 'all' as const, rules: [{ property_id: 'prop_rank', op: 'is_empty' }] },
          enabled: true,
        },
      }),
    })
    attach()
    flush()
    expect(matrixRuntime.graph.index.has('p1')).toBe(true)
    useSession.setState({
      tree: {
        ...tree,
        config: { ...tree.config, registry: [{ id: 'prop_rank', name: 'Rank', type: 'number' }] },
      },
    })
    expect(matrixRuntime.graph.index.has('p1')).toBe(false)
  })

  it('re-judges a Location filter when a page moves across it', () => {
    seed({
      matrixGraph: linked(),
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
    attach()
    flush()
    expect(matrixRuntime.graph.index.has('p2')).toBe(true)
    useSession.setState({ tree: relocated() })
    expect(matrixRuntime.graph.index.has('p2')).toBe(false)
  })

  it('reads nothing while a Nexus switch is between its reset and its landing', () => {
    const graphAsk = vi.fn(async () => ok({ links: [], values: {} }))
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'matrix:read': async () => ok(DEFAULT_MATRIX_CONFIG),
      'matrix:graph': graphAsk,
      'matrixLayout:load': async () => ok({ positions: {}, lens: null }),
      'matrixLayout:save': async () => ok(null),
    })
    seed()
    attach()
    flush()
    useSession.getState().resetMatrix()
    expect(graphAsk).not.toHaveBeenCalled()
    expect(matrixRuntime.graph.nodes).toHaveLength(0)
    expect(matrixRuntime.sim).toBeNull()
    useSession.getState().unloadMatrix()
    expect(graphAsk).toHaveBeenCalledTimes(1)
  })

  it('relaxes into forces pushed together with a rebuild', () => {
    seed({ matrixGraph: linked() })
    attach()
    flush()
    useSession.setState({
      matrixConfig: applyPatch(DEFAULT_MATRIX_CONFIG, {
        forces: { connection: { ...DEFAULT_MATRIX_CONFIG.forces.connection, strength: 0.9 } },
        display: { unlinked: false },
      }),
    })
    expect(matrixRuntime.sim?.awake).toBe(true)
  })

  it('keeps a held node following the pointer through a regroup', () => {
    seed({ matrixGraph: linked() })
    attach()
    flush()
    matrixRuntime.beginDrag('p1')
    matrixRuntime.moveDrag(400, 400)
    useSession.setState({
      matrixConfig: applyPatch(DEFAULT_MATRIX_CONFIG, { group: { mode: 'location' } }),
    })
    flush(2000)
    expect(matrixRuntime.draggingId).toBe('p1')
    expect(matrixRuntime.sim?.awake).toBe(true)
  })

  it('repaints when its stage moves', () => {
    seed()
    attach()
    flush()
    const paint = vi.fn()
    const stop = matrixRuntime.subscribe(paint)
    matrixRuntime.setStage(surface, { ...STAGE, x: 240 })
    step()
    stop()
    expect(paint).toHaveBeenCalledTimes(1)
  })

  it('keeps a held node following the pointer through a pushed forces change', () => {
    seed({ matrixGraph: linked() })
    attach()
    flush()
    matrixRuntime.beginDrag('p1')
    matrixRuntime.moveDrag(400, 400)
    useSession.setState({
      matrixConfig: applyPatch(DEFAULT_MATRIX_CONFIG, {
        forces: { connection: { ...DEFAULT_MATRIX_CONFIG.forces.connection, strength: 0.9 } },
      }),
    })
    flush(2000)
    expect(matrixRuntime.draggingId).toBe('p1')
    expect(matrixRuntime.sim?.awake).toBe(true)
  })

  it('wakes on a shuffle', () => {
    seed()
    attach()
    flush()
    expect(matrixRuntime.sim?.awake).toBe(false)
    matrixRuntime.shuffle()
    expect(matrixRuntime.sim?.awake).toBe(true)
    flush()
    expect(saveLayout).toHaveBeenCalledTimes(2)
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
