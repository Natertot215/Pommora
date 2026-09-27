// Main's own page writes are invisible to the watcher (the echo window), so every writer notes the page it touched and one flush per operation pushes them, grouped by container, with page ids resolved from the live tree.

import { getLiveTree } from './liveTree'
import { escapes } from '../Paths/pathSafety'
import { relDirname, relative } from '../Paths/posix'
import type { NexusTree, ValueChange } from './tree'

// One root at a time: a note under another root is a session that moved, and the old root's unflushed writes have no window left to reach.
// Each file maps to whether every write it saw this flush was a body edit.
let ledger: { root: string; byRel: Map<string, boolean> } | null = null

export function noteValueWrite(root: string | null, absFile: string, body = false): void {
  if (root === null) return
  const rel = relative(root, absFile)
  if (!rel || escapes(rel)) return
  if (ledger?.root !== root) ledger = { root, byRel: new Map() }
  ledger.byRel.set(rel, body && (ledger.byRel.get(rel) ?? true))
}

// A sidecar write silences its own watcher echo, so its writer notes the folder here and the confirm patches that node.
const sidecarWrites = new Set<string>()

export function noteSidecarWrite(absDir: string): void {
  sidecarWrites.add(absDir)
}

export function flushSidecarWrites(root: string): string[] {
  const rels = [...sidecarWrites]
    .map((abs) => relative(root, abs))
    .filter((rel) => rel && !escapes(rel))
  sidecarWrites.clear()
  return rels
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
  liveIdIndex(root).get(relative(root, absFile))

/** Null when the tree is not this root's, the id is absent, or two files claim it. */
export const livePathOf = (root: string, id: string): string | null =>
  liveIndices(root)?.byId.get(id) ?? null

// `only` takes just those files' notes, leaving the rest to the operation that wrote them.
export function flushValueWrites(root: string, only?: readonly string[]): ValueChange[] {
  if (ledger?.root !== root) return []
  const { byRel } = ledger
  const byPath = liveIdIndex(root)
  const out = new Map<string, ValueChange>()
  for (const file of only ?? byRel.keys()) {
    const body = byRel.get(file)
    if (body === undefined) continue
    byRel.delete(file)
    const rel = relDirname(file)
    const change = out.get(rel) ?? { rel, pageIds: [] }
    out.set(rel, change)
    const id = byPath.get(file)
    if (!id) continue
    change.pageIds.push(id)
    if (!body) continue
    change.bodyOnly ??= []
    change.bodyOnly.push(id)
  }
  return [...out.values()]
}
