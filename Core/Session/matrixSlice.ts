import type { Viewport } from '@pommora/core/Matrix/Engine/viewport'
import {
  applyPatch,
  DEFAULT_MATRIX_CONFIG,
  type MatrixConfig,
  mergeConfig,
  type MatrixPatch,
  SECTIONS,
} from '@pommora/core/Matrix/matrixConfig'
import { EMPTY_GRAPH_REPLY, type MatrixGraphReply } from '@pommora/core/Matrix/matrixGraph'
import type { Positions } from '@pommora/core/Matrix/matrixLayout'
import type { Result } from '../Contract/result'
import { pagesByIdOf, recordsByIdOf } from '../Nexus/treeIndex'
import { host as dialer } from '../Platform/dialer'
import type { Slice } from './sessionState'

export interface MatrixSlice {
  matrixConfig: MatrixConfig
  matrixGraph: MatrixGraphReply
  matrixPositions: Positions
  matrixViewport: Viewport | null
  matrixLoaded: boolean
  loadMatrix: () => Promise<void>
  patchMatrix: (patch: MatrixPatch) => void
  applyMatrixChanged: (config: MatrixConfig) => void
  refetchMatrixPages: (pageIds: Iterable<string>) => void
  refetchMatrixPaths: (paths: string[]) => void
  saveMatrixLayout: (positions: Positions) => void
  saveMatrixViewport: (viewport: Viewport) => void
  resetMatrix: () => void
}

const PER_NEXUS = {
  matrixConfig: DEFAULT_MATRIX_CONFIG,
  matrixGraph: EMPTY_GRAPH_REPLY,
  matrixPositions: {},
  matrixViewport: null,
  matrixLoaded: false,
} satisfies Partial<MatrixSlice>

// KNOB — pushes inside this window fold into one refetch.
const REFETCH_MS = 150

export const createMatrixSlice: Slice<MatrixSlice> = (set, get) => {
  let pendingPaths = new Set<string>()
  let refetch: ReturnType<typeof setTimeout> | null = null
  let triedTree: unknown = null

  const logged = (what: string, reply: Promise<Result<unknown>>): void => {
    void reply.then((ack) => {
      if (!ack.ok) console.error(`${what} failed:`, ack.error.message)
    })
  }

  // A renamed or moved page answers under its new path, so the rows it held under the old one go by id as well as by path.
  const merge = (
    held: MatrixGraphReply,
    next: MatrixGraphReply,
    paths: string[],
  ): MatrixGraphReply => {
    const replaced = new Set(paths)
    const ids = new Set([...Object.keys(next.values), ...next.links.map((l) => l.pageId)])
    const links = [
      ...held.links.filter((l) => !replaced.has(l.path) && !ids.has(l.pageId)),
      ...next.links,
    ]
    const values = { ...held.values, ...next.values }
    for (const l of held.links)
      if (replaced.has(l.path) && !ids.has(l.pageId)) delete values[l.pageId]
    return { links, values }
  }

  const cancelRefetch = (): void => {
    if (refetch) clearTimeout(refetch)
    refetch = null
  }

  const flush = async (): Promise<void> => {
    cancelRefetch()
    if (!get().matrixLoaded || pendingPaths.size === 0) return
    const paths = [...pendingPaths]
    pendingPaths = new Set()
    const reply = await dialer().ask('matrix:graph', paths)
    if (!reply.ok || !get().matrixLoaded) return
    set((s) => ({ matrixGraph: merge(s.matrixGraph, reply.value, paths) }))
  }

  // Buffered even before the first load, so a write that races it isn't lost; `flush` is what waits.
  const queue = (paths: string[]): void => {
    if (paths.length === 0) return
    for (const p of paths) pendingPaths.add(p)
    cancelRefetch()
    refetch = setTimeout(() => void flush(), REFETCH_MS)
  }

  return {
    ...PER_NEXUS,

    loadMatrix: async () => {
      const tree = get().tree
      if (get().matrixLoaded || tree === null || tree === triedTree) return
      triedTree = tree
      const asked = get().matrixConfig
      const [config, graph, layout] = await Promise.all([
        dialer().ask('matrix:read'),
        dialer().ask('matrix:graph'),
        dialer().ask('matrixLayout:load'),
      ])
      if (!config.ok) console.error('matrix read failed:', config.error.message)
      // A Nexus switch between the ask and its answer: the answer belongs to a root the store has left.
      if (get().tree !== tree) return
      // A section changed while the read was in flight is newer than the file it answered with, and recency-first keeps it; the rest still take the file's.
      if (config.ok) {
        const held = get().matrixConfig
        const landed = Object.fromEntries(
          SECTIONS.filter((k) => held[k] === asked[k]).map((k) => [k, config.value[k]]),
        )
        get().applyMatrixChanged({ ...held, ...landed })
      }
      // A refused graph leaves the load undone; clearing the mark after the config lands lets the next store change ask again.
      if (!graph.ok) {
        triedTree = null
        return
      }
      set({
        matrixGraph: graph.value,
        matrixPositions: layout.ok ? layout.value.positions : {},
        matrixViewport: layout.ok ? layout.value.viewport : null,
        matrixLoaded: true,
      })
      if (pendingPaths.size) void flush()
    },

    patchMatrix: (patch) => {
      set((s) => ({ matrixConfig: applyPatch(s.matrixConfig, patch) }))
      logged('matrix write', dialer().ask('matrix:write', patch))
    },

    // The watcher pushes our own writes back too; every section that reads the same keeps its reference, so only what moved rebuilds.
    applyMatrixChanged: (config) => {
      const merged = mergeConfig(get().matrixConfig, config)
      if (merged !== get().matrixConfig) set({ matrixConfig: merged })
    },

    refetchMatrixPages: (pageIds) => {
      const tree = get().tree
      if (!tree) return
      const byId = pagesByIdOf(tree)
      const paths: string[] = []
      for (const id of pageIds) {
        const page = byId.get(id)
        if (page) paths.push(page.path)
      }
      queue(paths)
    },

    refetchMatrixPaths: (paths) => queue(paths),

    saveMatrixLayout: (positions) => {
      const { tree, matrixLoaded, matrixPositions } = get()
      if (!tree || !matrixLoaded) return
      const live = recordsByIdOf(tree)
      const next: Positions = { ...matrixPositions, ...positions }
      for (const id of Object.keys(next)) if (!live.has(id)) delete next[id]
      set({ matrixPositions: next })
      logged('matrix layout save', dialer().ask('matrixLayout:save', { positions: next }))
    },

    saveMatrixViewport: (viewport) => {
      if (!get().matrixLoaded) return
      set({ matrixViewport: viewport })
      logged('matrix layout save', dialer().ask('matrixLayout:save', { viewport }))
    },

    resetMatrix: () => {
      pendingPaths = new Set()
      cancelRefetch()
      triedTree = null
      set({ ...PER_NEXUS })
    },
  }
}
