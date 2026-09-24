import type { Frame } from '@pommora/core/Matrix/Engine/viewport'
import {
  applyPatch,
  DEFAULT_MATRIX_CONFIG,
  type MatrixConfig,
  type MatrixPatch,
  SECTIONS,
} from '@pommora/core/Matrix/matrixConfig'
import {
  EMPTY_GRAPH_REPLY,
  type MatrixGraphReply,
  type MatrixLink,
} from '@pommora/core/Matrix/matrixGraph'
import type { LayoutPatch, Positions } from '@pommora/core/Matrix/matrixLayout'
import type { NexusTree } from '../Nexus/tree'
import { pagesByIdOf, recordsByIdOf } from '../Nexus/treeIndex'
import { stabilize } from '../Nexus/treeStabilize'
import { host as dialer } from '../Platform/dialer'
import { sessionWriter } from './saveScheduler'
import type { Slice } from './sessionState'

export type MatrixLoad =
  | { kind: 'unloaded' }
  | { kind: 'loading' }
  | { kind: 'loaded' }
  // A Nexus switch or a refused graph: the next load waits for a tree other than this one.
  | { kind: 'waiting'; tree: NexusTree | null }

export interface MatrixSlice {
  matrixConfig: MatrixConfig
  matrixGraph: MatrixGraphReply
  matrixPositions: Positions
  matrixFrame: Frame | null
  matrixLoad: MatrixLoad
  loadMatrix: () => Promise<void>
  patchMatrix: (patch: MatrixPatch) => void
  applyMatrixChanged: (config: MatrixConfig) => void
  refetchMatrixPages: (pageIds: Iterable<string>) => void
  refetchMatrixPaths: (paths: string[]) => void
  saveMatrixLayout: (rows: NonNullable<LayoutPatch['positions']>) => void
  saveMatrixFrame: (frame: Frame) => void
  unloadMatrix: () => void
  resetMatrix: () => void
}

const UNLOADED: MatrixLoad = { kind: 'unloaded' }

const HELD = {
  matrixGraph: EMPTY_GRAPH_REPLY,
  matrixPositions: {},
  matrixFrame: null,
} satisfies Partial<MatrixSlice>

const linkKey = (l: MatrixLink): string =>
  `${l.pageId}\n${l.path}\n${l.kind}\n${l.target}\n${l.qualifier}\n${l.count}`

const sameLinks = (a: MatrixLink[], b: MatrixLink[]): boolean => {
  if (a.length !== b.length) return false
  const keys = a.map(linkKey).sort()
  const other = b.map(linkKey).sort()
  return keys.every((k, i) => k === other[i])
}

// KNOB — pushes inside this window fold into one refetch.
const REFETCH_MS = 150

// The layout rides the session writer, so a burst of saves coalesces, lands on close and quit, and is held or cancelled across a Nexus switch like every other session save.
const FRAME_KEY = 'matrix-frame'
const LAYOUT_KEY = 'matrix-layout'

export const createMatrixSlice: Slice<MatrixSlice> = (set, get) => {
  let pendingPaths = new Set<string>()
  let refetch: ReturnType<typeof setTimeout> | null = null
  // Bumped whenever the store lets its graph go, so an answer asked for before that lands nowhere.
  let generation = 0
  // Every position row not yet sent; each save hands the writer all of them, so the one that lands carries every move before it.
  let unsaved: NonNullable<LayoutPatch['positions']> = {}

  // A renamed or moved page answers under its new path, so the rows it held under the old one go by id as well as by path.
  const merge = (
    held: MatrixGraphReply,
    next: MatrixGraphReply,
    paths: string[],
  ): MatrixGraphReply => {
    const replaced = new Set(paths)
    const ids = new Set([...Object.keys(next.values), ...next.links.map((l) => l.pageId)])
    const refetched = (l: MatrixLink): boolean => replaced.has(l.path) || ids.has(l.pageId)
    const values = { ...held.values, ...next.values }
    for (const l of held.links)
      if (replaced.has(l.path) && !ids.has(l.pageId)) delete values[l.pageId]
    // A save that moved no link keeps the held array, so nothing a link feeds is derived again.
    const links = sameLinks(held.links.filter(refetched), next.links)
      ? held.links
      : [...held.links.filter((l) => !refetched(l)), ...next.links]
    return { links, values }
  }

  const cancelRefetch = (): void => {
    if (refetch) clearTimeout(refetch)
    refetch = null
  }

  const flush = async (): Promise<void> => {
    cancelRefetch()
    if (get().matrixLoad.kind !== 'loaded' || pendingPaths.size === 0) return
    const asked = generation
    const paths = [...pendingPaths]
    pendingPaths = new Set()
    const reply = await dialer().ask('matrix:graph', paths)
    if (!reply.ok || generation !== asked) return
    set((s) => ({ matrixGraph: merge(s.matrixGraph, reply.value, paths) }))
  }

  // Buffered while a load is in flight, so a write that races it isn't lost; with nothing held or asked for, the next load reads it fresh.
  const queue = (paths: string[]): void => {
    const { kind } = get().matrixLoad
    if (paths.length === 0 || (kind !== 'loading' && kind !== 'loaded')) return
    for (const p of paths) pendingPaths.add(p)
    cancelRefetch()
    refetch = setTimeout(() => void flush(), REFETCH_MS)
  }

  const letGo = (): void => {
    generation += 1
    pendingPaths = new Set()
    unsaved = {}
    cancelRefetch()
  }

  return {
    matrixConfig: DEFAULT_MATRIX_CONFIG,
    ...HELD,
    matrixLoad: UNLOADED,

    loadMatrix: async () => {
      const { tree, matrixLoad } = get()
      const ready =
        matrixLoad.kind === 'unloaded' ||
        (matrixLoad.kind === 'waiting' && matrixLoad.tree !== tree)
      if (tree === null || !ready) return
      const started = generation
      set({ matrixLoad: { kind: 'loading' } })
      const asked = get().matrixConfig
      const [config, graph, layout] = await Promise.all([
        dialer().ask('matrix:read'),
        dialer().ask('matrix:graph'),
        dialer().ask('matrixLayout:load'),
      ])
      if (!config.ok) console.error('matrix read failed:', config.error.message)
      // An unload or a Nexus switch between the ask and its answer: the answer belongs to a graph the store has let go.
      if (generation !== started) return
      // A section changed while the read was in flight is newer than the file it answered with, and recency-first keeps it; the rest still take the file's.
      if (config.ok) {
        const held = get().matrixConfig
        const landed = Object.fromEntries(
          SECTIONS.filter((k) => held[k] === asked[k]).map((k) => [k, config.value[k]]),
        )
        get().applyMatrixChanged({ ...held, ...landed })
      }
      // A refused graph (no index yet) waits for the tree to move rather than asking again on every store change.
      if (!graph.ok) {
        set({ matrixLoad: { kind: 'waiting', tree } })
        return
      }
      const positions = layout.ok ? layout.value.positions : {}
      set({
        matrixGraph: graph.value,
        matrixPositions: positions,
        matrixFrame: layout.ok ? layout.value.frame : null,
        matrixLoad: { kind: 'loaded' },
      })
      // A node the tree has lost is let go once per load, not judged on every settle.
      const live = recordsByIdOf(tree)
      const lost = Object.keys(positions).filter((id) => !live.has(id))
      get().saveMatrixLayout(Object.fromEntries(lost.map((id) => [id, null])))
      if (pendingPaths.size) void flush()
    },

    patchMatrix: (patch) => {
      set((s) => ({ matrixConfig: applyPatch(s.matrixConfig, patch) }))
      void dialer()
        .ask('matrix:write', patch)
        .then((ack) => {
          if (!ack.ok) console.error('matrix write failed:', ack.error.message)
        })
    },

    // The watcher pushes our own writes back too; every section that reads the same keeps its reference, so only what moved rebuilds.
    applyMatrixChanged: (config) => {
      const kept = stabilize(config, get().matrixConfig)
      if (kept !== get().matrixConfig) set({ matrixConfig: kept })
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

    saveMatrixLayout: (rows) => {
      const ids = Object.keys(rows)
      if (get().matrixLoad.kind !== 'loaded' || ids.length === 0) return
      const next = { ...get().matrixPositions }
      for (const id of ids) {
        const p = rows[id]
        if (p) next[id] = p
        else delete next[id]
      }
      set({ matrixPositions: next })
      Object.assign(unsaved, rows)
      const positions = unsaved
      sessionWriter.schedule(LAYOUT_KEY, () => {
        if (unsaved === positions) unsaved = {}
        return dialer().ask('matrixLayout:save', { positions })
      })
    },

    // Not written back to `matrixFrame`: only a first build reads it, and every first build follows a load that read it fresh.
    saveMatrixFrame: (frame) => {
      if (get().matrixLoad.kind !== 'loaded') return
      sessionWriter.schedule(FRAME_KEY, () => dialer().ask('matrixLayout:save', { frame }))
    },

    // The last surface closing: its owed saves land, the graph and its refetches go, and the config stays for the menus that patch it.
    unloadMatrix: () => {
      void sessionWriter.flush(FRAME_KEY)
      void sessionWriter.flush(LAYOUT_KEY)
      letGo()
      set({ ...HELD, matrixLoad: UNLOADED })
    },

    // The old tree is still installed when a switch resets, so the load waits for the new one.
    resetMatrix: () => {
      letGo()
      set({
        matrixConfig: DEFAULT_MATRIX_CONFIG,
        ...HELD,
        matrixLoad: { kind: 'waiting', tree: get().tree },
      })
    },
  }
}
