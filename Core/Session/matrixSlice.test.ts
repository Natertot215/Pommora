// @vitest-environment jsdom
import { DEFAULT_MATRIX_CONFIG, parseMatrixConfig } from '@pommora/core/Matrix/matrixConfig'
import type { MatrixGraphReply, MatrixLink } from '@pommora/core/Matrix/matrixGraph'
import type { NexusTree } from '@pommora/core/Nexus/tree'
import { makeTree } from '@pommora/core/Testing/testTree'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubDialer } from '../vitest.setup'
import { useSession } from './store'

const link = (path: string, pageId: string, target: string): MatrixLink => ({
  path,
  pageId,
  kind: 'body',
  target,
  qualifier: '',
  count: 1,
})

const values = (id: string): MatrixGraphReply['values'] => ({
  [id]: { frontmatter: { ID: id }, createdAt: null, modifiedAt: null },
})

const GRAPH: MatrixGraphReply = {
  links: [link('Notes/Alpha.md', 'p1', 'beta')],
  values: values('p1'),
}

let channels: Record<string, ReturnType<typeof vi.fn>>
let tree: NexusTree

const seatLoaded = async (): Promise<void> => {
  await useSession.getState().loadMatrix()
}

beforeEach(() => {
  vi.useFakeTimers()
  tree = makeTree()
  channels = {
    'matrix:read': vi.fn(async () => ({ ok: true, value: DEFAULT_MATRIX_CONFIG })),
    'matrix:write': vi.fn(async () => ({ ok: true, value: null })),
    'matrix:graph': vi.fn(async () => ({ ok: true, value: GRAPH })),
    'matrixLayout:load': vi.fn(async () => ({
      ok: true,
      value: { positions: { p1: [1, 2] }, viewport: null },
    })),
    'matrixLayout:save': vi.fn(async () => ({ ok: true, value: null })),
  }
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer(channels)
  useSession.getState().resetMatrix()
  useSession.setState({ tree })
})

afterEach(() => {
  useSession.getState().resetMatrix()
  useSession.setState({ tree: null })
  vi.useRealTimers()
})

describe('the config half', () => {
  it('patches optimistically, keeps the untouched sections, and writes only the patched one', () => {
    const before = useSession.getState().matrixConfig
    useSession.getState().patchMatrix({ group: { mode: 'space' } })
    const after = useSession.getState().matrixConfig
    expect(after.group).toEqual({ mode: 'space' })
    expect(after.filter).toBe(before.filter)
    expect(after.forces).toBe(before.forces)
    expect(channels['matrix:write']).toHaveBeenCalledWith({ group: { mode: 'space' } })
  })

  it('keeps the reference when the push carries an equal config', () => {
    const before = useSession.getState().matrixConfig
    useSession.getState().applyMatrixChanged(parseMatrixConfig(null))
    expect(useSession.getState().matrixConfig).toBe(before)
    useSession.getState().applyMatrixChanged(parseMatrixConfig({ group: { mode: 'space' } }))
    expect(useSession.getState().matrixConfig).not.toBe(before)
  })

  it('keeps every section a push leaves alone, so only what moved rebuilds', () => {
    const before = useSession.getState().matrixConfig
    useSession.getState().applyMatrixChanged(parseMatrixConfig({ display: { hideIcon: true } }))
    const after = useSession.getState().matrixConfig
    expect(after.display).toEqual({ ...before.display, hideIcon: true })
    expect(after.group).toBe(before.group)
    expect(after.filter).toBe(before.filter)
    expect(after.forces).toBe(before.forces)
  })
})

describe('loadMatrix', () => {
  it('lands config, graph, and layout in one pass', async () => {
    await seatLoaded()
    const s = useSession.getState()
    expect(s.matrixLoaded).toBe(true)
    expect(s.matrixGraph).toEqual(GRAPH)
    expect(s.matrixPositions).toEqual({ p1: [1, 2] })
  })

  it('lands the config on a refused graph, stays unloaded, and asks again on the next pass', async () => {
    channels['matrix:read'].mockResolvedValue({
      ok: true,
      value: parseMatrixConfig({ display: { hideIcon: true } }),
    })
    channels['matrix:graph'].mockResolvedValue({
      ok: false,
      error: { code: 'operation-failed', message: 'The index is not ready.' },
    })
    await seatLoaded()
    expect(useSession.getState().matrixLoaded).toBe(false)
    expect(useSession.getState().matrixConfig.display.hideIcon).toBe(true)
    await seatLoaded()
    expect(channels['matrix:graph']).toHaveBeenCalledTimes(2)
  })

  it('discards a reply that lands after the tree moved', async () => {
    let land: (r: unknown) => void = () => {}
    channels['matrix:graph'].mockReturnValue(
      new Promise((resolve) => {
        land = resolve
      }),
    )
    const pass = useSession.getState().loadMatrix()
    useSession.setState({ tree: makeTree() })
    land({ ok: true, value: GRAPH })
    await pass
    expect(useSession.getState().matrixLoaded).toBe(false)
    expect(useSession.getState().matrixGraph).toEqual({ links: [], values: {} })
  })
})

describe('the refetch lane', () => {
  it('buffers a push that lands before the load and asks once it has', async () => {
    useSession.getState().refetchMatrixPaths(['Notes/Alpha.md'])
    await vi.advanceTimersByTimeAsync(200)
    expect(channels['matrix:graph']).not.toHaveBeenCalled()
    await seatLoaded()
    await vi.advanceTimersByTimeAsync(0)
    expect(channels['matrix:graph']).toHaveBeenLastCalledWith(['Notes/Alpha.md'])
  })

  it('reads a page id through the tree and folds a burst into one ask', async () => {
    await seatLoaded()
    channels['matrix:graph'].mockClear()
    useSession.getState().refetchMatrixPages(['p1'])
    useSession.getState().refetchMatrixPages(['p2', 'gone'])
    await vi.advanceTimersByTimeAsync(200)
    expect(channels['matrix:graph']).toHaveBeenCalledTimes(1)
    expect(channels['matrix:graph']).toHaveBeenCalledWith(['Notes/Alpha.md', 'Notes/Ideas/Beta.md'])
  })

  it('merges by path and by page id, so a renamed page keeps one set of rows', async () => {
    await seatLoaded()
    channels['matrix:graph'].mockResolvedValue({
      ok: true,
      value: { links: [link('Notes/Renamed.md', 'p1', 'beta')], values: values('p1') },
    })
    useSession.getState().refetchMatrixPaths(['Notes/Renamed.md'])
    await vi.advanceTimersByTimeAsync(200)
    expect(useSession.getState().matrixGraph.links).toEqual([
      link('Notes/Renamed.md', 'p1', 'beta'),
    ])
    channels['matrix:graph'].mockResolvedValue({ ok: true, value: { links: [], values: {} } })
    useSession.getState().refetchMatrixPaths(['Notes/Renamed.md'])
    await vi.advanceTimersByTimeAsync(200)
    expect(useSession.getState().matrixGraph).toEqual({ links: [], values: {} })
  })
})

describe('the layout half', () => {
  it('prunes ids the tree has lost and refuses with no tree', async () => {
    await seatLoaded()
    useSession.getState().saveMatrixLayout({ p2: [3, 4], ghost: [5, 6] })
    expect(useSession.getState().matrixPositions).toEqual({ p1: [1, 2], p2: [3, 4] })
    expect(channels['matrixLayout:save']).toHaveBeenCalledWith({
      positions: { p1: [1, 2], p2: [3, 4] },
    })
    channels['matrixLayout:save'].mockClear()
    useSession.setState({ tree: null })
    useSession.getState().saveMatrixLayout({ p1: [9, 9] })
    expect(channels['matrixLayout:save']).not.toHaveBeenCalled()
  })

  it('saves the viewport alone once loaded', async () => {
    useSession.getState().saveMatrixViewport({ x: 1, y: 2, zoom: 3 })
    expect(channels['matrixLayout:save']).not.toHaveBeenCalled()
    await seatLoaded()
    useSession.getState().saveMatrixViewport({ x: 1, y: 2, zoom: 3 })
    expect(useSession.getState().matrixViewport).toEqual({ x: 1, y: 2, zoom: 3 })
    expect(channels['matrixLayout:save']).toHaveBeenCalledWith({
      viewport: { x: 1, y: 2, zoom: 3 },
    })
  })
})

describe('resetMatrix', () => {
  it('returns every field to its per-Nexus value', async () => {
    await seatLoaded()
    useSession.getState().saveMatrixViewport({ x: 1, y: 2, zoom: 3 })
    useSession.getState().resetMatrix()
    const s = useSession.getState()
    expect(s.matrixConfig).toBe(DEFAULT_MATRIX_CONFIG)
    expect(s.matrixGraph).toEqual({ links: [], values: {} })
    expect(s.matrixPositions).toEqual({})
    expect(s.matrixViewport).toBeNull()
    expect(s.matrixLoaded).toBe(false)
  })
})
