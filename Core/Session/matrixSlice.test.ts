// @vitest-environment jsdom
import { DEFAULT_MATRIX_CONFIG, parseMatrixConfig } from '../Matrix/matrixConfig'
import type { MatrixGraphReply, MatrixLink } from '../Matrix/matrixGraph'
import type { NexusTree } from '../Nexus/tree'
import { makeTree } from '../Testing/testTree'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubDialer } from '../vitest.setup'
import { cancelAllSaves } from './saveScheduler'
import { useSession } from './store'

const link = (path: string, pageId: string, target: string): MatrixLink => ({
  path,
  pageId,
  kind: 'body',
  target,
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

const heldGraph = (): ((r: unknown) => void) => {
  let land: (r: unknown) => void = () => {}
  channels['matrix:graph'].mockReturnValue(
    new Promise((resolve) => {
      land = resolve
    }),
  )
  return (r) => land(r)
}

const seatLoaded = async (): Promise<void> => {
  await useSession.getState().loadMatrix()
}

beforeEach(() => {
  vi.useFakeTimers()
  tree = makeTree()
  channels = {
    'matrix:write': vi.fn(async () => ({ ok: true, value: null })),
    'matrix:graph': vi.fn(async () => ({ ok: true, value: GRAPH })),
    'matrixLayout:load': vi.fn(async () => ({
      ok: true,
      value: { positions: { p1: [1, 2] }, lens: null },
    })),
    'matrixLayout:save': vi.fn(async () => ({ ok: true, value: null })),
  }
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer(channels)
  useSession.getState().resetMatrix()
  useSession.getState().unloadMatrix()
  useSession.setState({ tree })
})

afterEach(() => {
  cancelAllSaves()
  useSession.getState().resetMatrix()
  useSession.setState({ tree: null })
  vi.useRealTimers()
})

describe('the config half', () => {
  it('patches optimistically and writes only the patched section', () => {
    useSession.getState().patchMatrix({ group: { mode: 'space' } })
    expect(useSession.getState().matrixConfig.group).toEqual({ mode: 'space' })
    expect(channels['matrix:write']).toHaveBeenCalledWith({ group: { mode: 'space' } })
  })

  it('keeps the reference for a patch that changes nothing', () => {
    const before = useSession.getState().matrixConfig
    useSession.getState().patchMatrix({ forces: { connection: { gravity: 1 } } })
    expect(useSession.getState().matrixConfig).toBe(before)
  })

  it('keeps the reference for a push that differs only in key order', () => {
    const before = useSession.getState().matrixConfig
    const reversed = (o: object): object => Object.fromEntries(Object.entries(o).reverse())
    const pushed = Object.fromEntries(
      Object.entries(before).map(([section, v]) => [section, reversed(v)]),
    ) as unknown as typeof before
    useSession.getState().applyMatrixChanged(pushed)
    expect(useSession.getState().matrixConfig).toBe(before)
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
  it('lands the graph and the layout in one pass', async () => {
    await seatLoaded()
    const s = useSession.getState()
    expect(s.matrixLoad.kind).toBe('loaded')
    expect(s.matrixGraph).toEqual(GRAPH)
    expect(s.matrixPositions).toEqual({ p1: [1, 2] })
  })

  it('asks again after a refused graph only once the tree has moved', async () => {
    channels['matrix:graph'].mockResolvedValue({
      ok: false,
      error: { code: 'operation-failed', message: 'The index is not ready.' },
    })
    const land = heldGraph()
    const pass = useSession.getState().loadMatrix()
    useSession.getState().refetchMatrixPaths(['Notes/Alpha.md'])
    land({ ok: false, error: { code: 'operation-failed', message: 'The index is not ready.' } })
    await pass
    expect(useSession.getState().matrixLoad.kind).toBe('refused')
    await seatLoaded()
    expect(channels['matrix:graph']).toHaveBeenCalledTimes(1)
    channels['matrix:graph'].mockResolvedValue({ ok: true, value: GRAPH })
    useSession.setState({ tree: makeTree() })
    await seatLoaded()
    await vi.advanceTimersByTimeAsync(200)
    expect(channels['matrix:graph']).toHaveBeenCalledTimes(2)
    expect(channels['matrix:graph']).toHaveBeenLastCalledWith()
  })

  it('keeps a reply that lands after an edit in the same Nexus, and starts no second load meanwhile', async () => {
    const land = heldGraph()
    const pass = useSession.getState().loadMatrix()
    useSession.setState({ tree: makeTree() })
    void useSession.getState().loadMatrix()
    land({ ok: true, value: GRAPH })
    await pass
    expect(channels['matrix:graph']).toHaveBeenCalledTimes(1)
    expect(useSession.getState().matrixLoad.kind).toBe('loaded')
    expect(useSession.getState().matrixGraph).toEqual(GRAPH)
  })

  it('discards a reply that lands after the Matrix was let go', async () => {
    for (const letGo of ['unloadMatrix', 'resetMatrix'] as const) {
      const land = heldGraph()
      const pass = useSession.getState().loadMatrix()
      useSession.getState()[letGo]()
      land({ ok: true, value: GRAPH })
      await pass
      expect(useSession.getState().matrixLoad.kind).not.toBe('loaded')
      expect(useSession.getState().matrixGraph).toEqual({ links: [], values: {} })
      useSession.setState({ tree: makeTree() })
    }
  })

  it('reads nothing between a switch’s reset and its landing, then loads on the same tree as reopening the open Nexus does', async () => {
    await seatLoaded()
    useSession.getState().resetMatrix()
    await seatLoaded()
    expect(useSession.getState().matrixLoad.kind).toBe('switching')
    expect(channels['matrix:graph']).toHaveBeenCalledTimes(1)
    useSession.getState().unloadMatrix()
    await seatLoaded()
    expect(useSession.getState().matrixLoad.kind).toBe('loaded')
    expect(channels['matrix:graph']).toHaveBeenCalledTimes(2)
  })
})

describe('the refetch lane', () => {
  it('drops a push with nothing loaded, and buffers one that races the load until it lands', async () => {
    useSession.getState().refetchMatrixPaths(['Notes/Stale.md'])
    const land = heldGraph()
    const pass = useSession.getState().loadMatrix()
    useSession.getState().refetchMatrixPaths(['Notes/Alpha.md'])
    await vi.advanceTimersByTimeAsync(200)
    expect(channels['matrix:graph']).toHaveBeenCalledTimes(1)
    land({ ok: true, value: GRAPH })
    await pass
    await vi.advanceTimersByTimeAsync(0)
    expect(channels['matrix:graph']).toHaveBeenCalledTimes(2)
    expect(channels['matrix:graph']).toHaveBeenLastCalledWith(['Notes/Alpha.md'])
  })

  it('stops refetching once unloaded', async () => {
    await seatLoaded()
    channels['matrix:graph'].mockClear()
    useSession.getState().unloadMatrix()
    useSession.getState().refetchMatrixPaths(['Notes/Alpha.md'])
    await vi.advanceTimersByTimeAsync(200)
    expect(channels['matrix:graph']).not.toHaveBeenCalled()
    expect(useSession.getState().matrixGraph).toEqual({ links: [], values: {} })
  })

  it('keeps the held links when a refetch moved none', async () => {
    await seatLoaded()
    const before = useSession.getState().matrixGraph.links
    channels['matrix:graph'].mockResolvedValue({
      ok: true,
      value: {
        links: [link('Notes/Alpha.md', 'p1', 'beta')],
        values: { p1: { frontmatter: { ID: 'p1' }, createdAt: null, modifiedAt: 'later' } },
      },
    })
    useSession.getState().refetchMatrixPaths(['Notes/Alpha.md'])
    await vi.advanceTimersByTimeAsync(200)
    const after = useSession.getState().matrixGraph
    expect(after.links).toBe(before)
    expect(after.values.p1.modifiedAt).toBe('later')
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
  it('lets go of the nodes the tree has lost once, as it loads', async () => {
    channels['matrixLayout:load'].mockResolvedValue({
      ok: true,
      value: { positions: { p1: [1, 2], ghost: [5, 6] }, lens: null },
    })
    await seatLoaded()
    expect(useSession.getState().matrixPositions).toEqual({ p1: [1, 2] })
    await vi.advanceTimersByTimeAsync(400)
    expect(channels['matrixLayout:save']).toHaveBeenCalledExactlyOnceWith({
      positions: { ghost: null },
    })
  })

  it('sends only the nodes that moved, every move of a burst in one save', async () => {
    await seatLoaded()
    useSession.getState().saveMatrixLayout({ p2: [3, 4] })
    useSession.getState().saveMatrixLayout({ p1: [7, 8] })
    expect(useSession.getState().matrixPositions).toEqual({ p1: [7, 8], p2: [3, 4] })
    await vi.advanceTimersByTimeAsync(400)
    expect(channels['matrixLayout:save']).toHaveBeenCalledExactlyOnceWith({
      positions: { p2: [3, 4], p1: [7, 8] },
    })
    useSession.getState().saveMatrixLayout({ p2: [9, 9] })
    await vi.advanceTimersByTimeAsync(400)
    expect(channels['matrixLayout:save']).toHaveBeenLastCalledWith({ positions: { p2: [9, 9] } })
  })

  it('saves the lens alone once loaded, the last of a burst', async () => {
    useSession.getState().saveMatrixLens({ cx: 1, cy: 2, w: 3, h: 4 })
    await vi.advanceTimersByTimeAsync(400)
    expect(channels['matrixLayout:save']).not.toHaveBeenCalled()
    await seatLoaded()
    useSession.getState().saveMatrixLens({ cx: 0, cy: 0, w: 3, h: 4 })
    useSession.getState().saveMatrixLens({ cx: 1, cy: 2, w: 3, h: 4 })
    await vi.advanceTimersByTimeAsync(400)
    expect(channels['matrixLayout:save']).toHaveBeenCalledExactlyOnceWith({
      lens: { cx: 1, cy: 2, w: 3, h: 4 },
    })
  })

  it('keeps positions owed behind a save in flight through an unload and a reload', async () => {
    let land: (r: unknown) => void = () => {}
    channels['matrixLayout:save'].mockReturnValueOnce(
      new Promise((resolve) => {
        land = resolve
      }),
    )
    await seatLoaded()
    useSession.getState().saveMatrixLayout({ p1: [1, 1] })
    await vi.advanceTimersByTimeAsync(400)
    useSession.getState().saveMatrixLayout({ p2: [2, 2] })
    useSession.getState().unloadMatrix()
    await seatLoaded()
    useSession.getState().saveMatrixLayout({ p1: [3, 3] })
    land({ ok: true, value: null })
    await vi.advanceTimersByTimeAsync(400)
    expect(channels['matrixLayout:save']).toHaveBeenLastCalledWith({
      positions: { p2: [2, 2], p1: [3, 3] },
    })
  })

  it('owes a refused save again, and seats owed rows over a reload', async () => {
    channels['matrixLayout:save'].mockResolvedValueOnce({
      ok: false,
      error: { code: 'busy', message: 'Busy.' },
    })
    await seatLoaded()
    useSession.getState().saveMatrixLayout({ p1: [7, 7] })
    await vi.advanceTimersByTimeAsync(400)
    useSession.getState().unloadMatrix()
    channels['matrixLayout:save'].mockClear()
    let finish: (r: unknown) => void = () => {}
    channels['matrixLayout:save'].mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    await seatLoaded()
    expect(useSession.getState().matrixPositions).toEqual({ p1: [7, 7] })
    useSession.getState().saveMatrixLayout({ p2: [8, 8] })
    await vi.advanceTimersByTimeAsync(400)
    expect(channels['matrixLayout:save']).toHaveBeenCalledWith({
      positions: { p1: [7, 7], p2: [8, 8] },
    })
    finish({ ok: true, value: null })
    await vi.advanceTimersByTimeAsync(0)
  })

  it('lands what it owes as it unloads', async () => {
    await seatLoaded()
    useSession.getState().saveMatrixLens({ cx: 1, cy: 2, w: 3, h: 4 })
    useSession.getState().saveMatrixLayout({ p1: [5, 6] })
    useSession.getState().unloadMatrix()
    expect(channels['matrixLayout:save']).toHaveBeenCalledWith({
      lens: { cx: 1, cy: 2, w: 3, h: 4 },
    })
    expect(channels['matrixLayout:save']).toHaveBeenCalledWith({ positions: { p1: [5, 6] } })
  })
})

describe('resetMatrix', () => {
  it('returns every field to its per-Nexus value', async () => {
    await seatLoaded()
    useSession.getState().saveMatrixLens({ cx: 1, cy: 2, w: 3, h: 4 })
    useSession.getState().resetMatrix()
    const s = useSession.getState()
    expect(s.matrixConfig).toBe(DEFAULT_MATRIX_CONFIG)
    expect(s.matrixGraph).toEqual({ links: [], values: {} })
    expect(s.matrixPositions).toEqual({})
    expect(s.matrixLens).toBeNull()
    expect(s.matrixLoad).toEqual({ kind: 'switching' })
  })
})
