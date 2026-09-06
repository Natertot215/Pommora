// Page writes are invisible to watcher, so writers note touched pages and flush per operation, grouped by container.

import { getLiveTree } from './liveTree'
import { escapes } from '../Paths/pathSafety'
import { parentOf } from './treePatch'
import { relPosix } from '../Paths/paths'
import type { NexusTree, ValueChange } from './tree'

// One root at a time: moved sessions leave unflushed writes unreachable.
let ledger: { root: string; byRel: Map<string, Set<string>> } | null = null

export function noteValueWrite(root: string | null, absFile: string): void {
  if (root === null) return
  const rel = relPosix(root, absFile)
  if (!rel || escapes(rel)) return
  if (ledger?.root !== root) ledger = { root, byRel: new Map() }
  const container = parentOf(rel)
  const files = ledger.byRel.get(container) ?? new Set<string>()
  ledger.byRel.set(container, files)
  files.add(rel)
}

interface PageIndices {
  byPath: ReadonlyMap<string, string>
  /** null marks an id two files claim. */
  byId: ReadonlyMap<string, string | null>
}

const indices = new WeakMap<NexusTree, PageIndices>()

function indicesOf(tree: NexusTree): PageIndices {
  const held = indices.get(tree)
  if (held) return held
  const byPath = new Map<string, string>()
  const byId = new Map<string, string | null>()
  const walk = (nodes: { pages: { id: string; path: string }[]; sets?: unknown[] }[]): void => {
    for (const n of nodes) {
      for (const p of n.pages) {
        byPath.set(p.path, p.id)
        byId.set(p.id, byId.has(p.id) ? null : p.path)
      }
      walk((n.sets ?? []) as typeof nodes)
    }
  }
  walk(tree.collections)
  const built = { byPath, byId }
  indices.set(tree, built)
  return built
}

export const pageIdIndex = (tree: NexusTree | null): ReadonlyMap<string, string> =>
  tree ? indicesOf(tree).byPath : new Map()

/** Null when the tree is not this root's, so a stale tree never names ids for another nexus. */
function liveIndices(root: string): PageIndices | null {
  const tree = getLiveTree()
  return tree?.nexus.rootPath === root ? indicesOf(tree) : null
}

export const liveIdIndex = (root: string): ReadonlyMap<string, string> =>
  liveIndices(root)?.byPath ?? new Map()

export const liveIdOf = (root: string, absFile: string): string | undefined =>
  liveIdIndex(root).get(relPosix(root, absFile))

/** Null when the tree is not this root's, the id is absent, or two files claim it. */
export const livePathOf = (root: string, id: string): string | null =>
  liveIndices(root)?.byId.get(id) ?? null

export function flushValueWrites(root: string): ValueChange[] {
  if (ledger?.root !== root) return []
  const { byRel } = ledger
  ledger = null
  const byPath = liveIdIndex(root)
  return [...byRel].map(([rel, files]) => ({
    rel,
    pageIds: [...files].flatMap((f) => {
      const id = byPath.get(f)
      return id ? [id] : []
    }),
  }))
}
