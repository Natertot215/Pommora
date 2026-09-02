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

/** The live tree's path→id map when it holds `root`; empty otherwise, so a stale tree never
 *  names ids for another nexus. */
export function liveIdIndex(root: string): Map<string, string> {
  const tree = getLiveTree()
  return pageIdIndex(tree?.nexus.rootPath === root ? tree : null)
}

export function pageIdIndex(tree: NexusTree | null): Map<string, string> {
  const byPath = new Map<string, string>()
  const walk = (nodes: { pages: { id: string; path: string }[]; sets?: unknown[] }[]): void => {
    for (const n of nodes) {
      for (const p of n.pages) byPath.set(p.path, p.id)
      walk((n.sets ?? []) as typeof nodes)
    }
  }
  if (tree) walk(tree.collections)
  return byPath
}

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
