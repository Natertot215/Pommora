// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fail, ok } from '../Contract/result'
import { useSession } from '../Session/store'
import { makeTree } from '../Testing/testTree'
import { stubDialer } from '../vitest.setup'
import { applyPatch, DEFAULT_MATRIX_CONFIG, type MatrixConfig } from './matrixConfig'
import { EMPTY_GRAPH_REPLY, type MatrixGraphReply, type MatrixLink } from './matrixGraph'
import { matrixRuntime } from './matrixRuntime'

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

const STAGE = { x: 0, y: 0, width: 800, height: 600 }

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
let saveViewport: ReturnType<typeof vi.fn>
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

function seed(over: Record<string, unknown> = {}): void {
  saveLayout = vi.fn()
  saveViewport = vi.fn()
  useSession.setState({
    tree: makeTree(),
    matrixConfig: DEFAULT_MATRIX_CONFIG,
    matrixGraph: EMPTY_GRAPH_REPLY,
    matrixPositions: {},
    matrixViewport: { x: 0, y: 0, zoom: 1 },
    matrixLoaded: true,
    saveMatrixLayout: saveLayout as never,
    saveMatrixViewport: saveViewport as never,
    ...over,
  } as never)
}

const attach = (): void => {
  detach = matrixRuntime.attach({ visible: () => visible })
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
  matrixRuntime.setStage(STAGE)
  matrixRuntime.setViewport({ x: 0, y: 0, zoom: 1 })
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

  it('pins, moves, and re-settles through a drag; the dropped node stays put', () => {
    seed()
    attach()
    flush()
    matrixRuntime.beginDrag(0)
    expect(matrixRuntime.graph.nodes[0].pinned).toBe(true)
    matrixRuntime.moveDrag(120, -40)
    expect(matrixRuntime.graph.nodes[0].x).toBe(120)
    expect(matrixRuntime.graph.nodes[0].y).toBe(-40)
    matrixRuntime.endDrag()
    expect(matrixRuntime.sim?.awake).toBe(true)
    flush()
    expect(matrixRuntime.sim?.awake).toBe(false)
    expect([matrixRuntime.graph.nodes[0].x, matrixRuntime.graph.nodes[0].y]).toEqual([120, -40])
    expect(saveLayout.mock.lastCall?.[0][matrixRuntime.graph.nodes[0].id]).toEqual([120, -40, 1])
  })

  it('keeps a dropped node pinned across a rebuild', () => {
    seed()
    attach()
    flush()
    matrixRuntime.beginDrag(0)
    matrixRuntime.moveDrag(120, -40)
    matrixRuntime.endDrag()
    flush()
    useSession.getState().patchMatrix({ group: { mode: 'location' } })
    flush()
    expect(matrixRuntime.graph.nodes[0].pinned).toBe(true)
    expect(matrixRuntime.graph.nodes[1].pinned).toBe(false)
    matrixRuntime.shuffle()
    expect(matrixRuntime.graph.nodes[0].pinned).toBe(false)
  })

  it('keeps the dragged node pinned and following across a rebuild', () => {
    seed()
    attach()
    flush()
    matrixRuntime.beginDrag(0)
    matrixRuntime.moveDrag(120, -40)
    useSession.setState({ matrixGraph: { links: [], values: {} } })
    const i = matrixRuntime.draggingIndex()
    expect(i).toBeGreaterThanOrEqual(0)
    expect(matrixRuntime.graph.nodes[i].pinned).toBe(true)
    expect(matrixRuntime.graph.nodes[i].x).toBe(120)
    matrixRuntime.moveDrag(200, 10)
    expect(matrixRuntime.graph.nodes[i].x).toBe(200)
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

  it('fits the graph to the stage on the first settle when no viewport was persisted', () => {
    seed({ matrixViewport: null })
    attach()
    flush()
    vi.runAllTimers()
    expect(saveViewport).toHaveBeenCalledTimes(1)
    expect(saveViewport.mock.calls[0][0]).toEqual(matrixRuntime.viewport)
    expect(matrixRuntime.viewport).not.toEqual({ x: 0, y: 0, zoom: 1 })
  })

  it('waits for a sized stage before fitting a first open that carries positions', () => {
    matrixRuntime.setStage({ x: 0, y: 0, width: 0, height: 0 })
    matrixRuntime.setViewport({ x: 0, y: 0, zoom: 1 })
    vi.runAllTimers()
    seed({ matrixViewport: null, matrixPositions: { p1: [0, 0], p2: [60, 0] } })
    attach()
    flush()
    expect(saveViewport).not.toHaveBeenCalled()
    matrixRuntime.setStage(STAGE)
    vi.runAllTimers()
    expect(saveViewport).toHaveBeenCalledTimes(1)
    expect(matrixRuntime.viewport).not.toEqual({ x: 0, y: 0, zoom: 1 })
  })

  it('writes one viewport for a pan, and the last surface flushes it as it leaves', () => {
    seed()
    attach()
    flush()
    saveViewport.mockClear()
    matrixRuntime.setViewport({ x: 10, y: 0, zoom: 1 })
    matrixRuntime.setViewport({ x: 20, y: 0, zoom: 1 })
    expect(saveViewport).not.toHaveBeenCalled()
    detach?.()
    detach = null
    expect(saveViewport).toHaveBeenCalledTimes(1)
    expect(saveViewport.mock.calls[0][0]).toEqual({ x: 20, y: 0, zoom: 1 })
    vi.runAllTimers()
    expect(saveViewport).toHaveBeenCalledTimes(1)
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

  it('seats a marked position as a held pin on the first build, and Shuffle releases it', () => {
    seed({ matrixPositions: { p1: [0, 0, 1], p2: [60, 0] } })
    attach()
    const at = (id: string) => matrixRuntime.graph.nodes[matrixRuntime.graph.index.get(id) ?? -1]
    expect([at('p1').pinned, at('p2').pinned]).toEqual([true, false])
    matrixRuntime.shuffle()
    expect(at('p1').pinned).toBe(false)
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
    useSession.setState({ matrixConfig: config({ hideIcon: true, hideLocation: true }) })
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
      'matrixLayout:load': async () => ok({ positions: {}, viewport: null }),
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

  it('pans the picture by a moved stage centre and never on the first stage', () => {
    seed()
    attach()
    flush()
    const before = matrixRuntime.viewport
    matrixRuntime.setStage({ ...STAGE, x: 100, width: STAGE.width - 100 })
    expect(matrixRuntime.viewport.x).toBeCloseTo(before.x - 50 / before.zoom)
    matrixRuntime.setStage(STAGE)
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

  it('wakes on a shuffle', () => {
    seed()
    attach()
    flush()
    expect(matrixRuntime.sim?.awake).toBe(false)
    matrixRuntime.shuffle()
    expect(matrixRuntime.sim?.awake).toBe(true)
  })
})
