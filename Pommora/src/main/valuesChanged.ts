// The write leg of `values:changed`: main's own page writes are invisible to the watcher (the echo
// window), so every writer notes the page it touched and one flush per operation pushes them,
// grouped by container, with page ids resolved from the live tree.

import { dirname, relative, sep } from 'node:path'
import { getLiveTree } from './liveTree'
import type { NexusTree } from '@shared/types'

const ledger = new Map<string, Map<string, Set<string>>>()

const posix = (p: string): string => p.split(sep).join('/')

export function noteValueWrite(root: string | null, absFile: string): void {
  if (root === null) return
  const rel = relative(root, absFile)
  if (!rel || rel.startsWith('..')) return
  const byRel = ledger.get(root) ?? new Map<string, Set<string>>()
  ledger.set(root, byRel)
  const container = posix(dirname(rel))
  const files = byRel.get(container) ?? new Set<string>()
  byRel.set(container, files)
  files.add(posix(rel))
}

export function pageIdOf(tree: NexusTree | null, rel: string): string | null {
  if (!tree) return null
  const walk = (
    nodes: { pages: { id: string; path: string }[]; sets?: unknown[] }[],
  ): string | null => {
    for (const n of nodes) {
      const hit = n.pages.find((p) => p.path === rel)
      if (hit) return hit.id
      const deeper = walk((n.sets ?? []) as typeof nodes)
      if (deeper) return deeper
    }
    return null
  }
  return walk(tree.collections)
}

/** Drain one root's ledger into the push payload — one entry per container. */
export function flushValueWrites(root: string): { rel: string; pageIds: string[] }[] {
  const byRel = ledger.get(root)
  ledger.delete(root)
  if (!byRel) return []
  const tree = getLiveTree()
  const held = tree?.nexus.rootPath === root ? tree : null
  return [...byRel].map(([rel, files]) => ({
    rel,
    pageIds: [...files].flatMap((f) => {
      const id = pageIdOf(held, f)
      return id ? [id] : []
    }),
  }))
}
