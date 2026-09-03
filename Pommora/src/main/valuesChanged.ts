// The write leg of `values:changed`: main's own page writes are invisible to the watcher (the echo
// window), so every writer notes the page it touched and one flush per operation pushes them,
// grouped by container, with page ids resolved from the live tree.

import { getLiveTree } from './liveTree'
import { relPosix } from './paths'
import type { NexusTree, ValueChange } from '@shared/types'

export const containerOf = (rel: string): string =>
  rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : ''

// One root at a time: a note under another root is a session that moved, and the old root's
// unflushed writes have no window left to reach.
let ledger: { root: string; byRel: Map<string, Set<string>> } | null = null

export function noteValueWrite(root: string | null, absFile: string): void {
  if (root === null) return
  const rel = relPosix(root, absFile)
  if (!rel || rel.startsWith('..')) return
  if (ledger?.root !== root) ledger = { root, byRel: new Map() }
  const container = containerOf(rel)
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

/** Both directions of a tree's page index, walked once per tree object. */
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

/** The live tree's indices, or null when the tree is not this root's — so a stale tree never
 *  names ids for another nexus. */
function liveIndices(root: string): PageIndices | null {
  const tree = getLiveTree()
  return tree?.nexus.rootPath === root ? indicesOf(tree) : null
}

/** The live tree's path→id map when it holds `root`; empty otherwise. */
export const liveIdIndex = (root: string): ReadonlyMap<string, string> =>
  liveIndices(root)?.byPath ?? new Map()

export const liveIdOf = (root: string, absFile: string): string | undefined =>
  liveIdIndex(root).get(relPosix(root, absFile))

/** The live path of a page by id — null when the tree is not this root's, the id is absent, or
 *  two files claim it. */
export const livePathOf = (root: string, id: string): string | null =>
  liveIndices(root)?.byId.get(id) ?? null

/** Drain one root's ledger into the push payload — one entry per container. */
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
