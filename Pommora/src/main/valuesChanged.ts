// The write leg of `values:changed`: main's own page writes are invisible to the watcher (the echo
// window), so every writer notes the page it touched and one flush per operation pushes them,
// grouped by container, with page ids resolved from the live tree.

import { dirname } from 'node:path'
import { getLiveTree } from './liveTree'
import { relPosix } from './paths'
import type { NexusTree, ValueChange } from '@shared/types'

const ledger = new Map<string, Map<string, Set<string>>>()

export function noteValueWrite(root: string | null, absFile: string): void {
  if (root === null) return
  const rel = relPosix(root, absFile)
  if (!rel || rel.startsWith('..')) return
  const byRel = ledger.get(root) ?? new Map<string, Set<string>>()
  ledger.set(root, byRel)
  const container = dirname(rel)
  const files = byRel.get(container) ?? new Set<string>()
  byRel.set(container, files)
  files.add(rel)
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

export const pageIdOf = (tree: NexusTree | null, rel: string): string | null =>
  pageIdIndex(tree).get(rel) ?? null

/** Drain one root's ledger into the push payload — one entry per container. */
export function flushValueWrites(root: string): ValueChange[] {
  const byRel = ledger.get(root)
  ledger.delete(root)
  if (!byRel) return []
  const tree = getLiveTree()
  const byPath = pageIdIndex(tree?.nexus.rootPath === root ? tree : null)
  return [...byRel].map(([rel, files]) => ({
    rel,
    pageIds: [...files].flatMap((f) => {
      const id = byPath.get(f)
      return id ? [id] : []
    }),
  }))
}
