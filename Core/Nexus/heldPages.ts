// The held tree's pages by path, by id, and by title, for the host's writers.

import { heldTreeOf } from './liveTree'
import { relative, titleFromPath } from '../Paths/posix'
import { normalizeTitle } from '../Connections/connections'
import type { Frozen } from '../Properties/propertyValue'
import { entityMemo, type NexusTree } from './tree'

interface PageIndices {
  byPath: ReadonlyMap<string, string>
  /** null marks an id two files claim. */
  byId: ReadonlyMap<string, string | null>
}

const indicesOf = entityMemo((tree): PageIndices => {
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
  return { byPath, byId }
})

export const pageIdIndex = (tree: NexusTree | null): ReadonlyMap<string, string> =>
  tree ? indicesOf(tree).byPath : new Map()

/** Null when the tree is not this root's, so a stale tree never names ids for another nexus. */
function liveIndices(root: string): PageIndices | null {
  const tree = heldTreeOf(root)
  return tree ? indicesOf(tree) : null
}

export const liveIdIndex = (root: string): ReadonlyMap<string, string> =>
  liveIndices(root)?.byPath ?? new Map()

export const liveIdOf = (root: string, absFile: string): string | undefined =>
  liveIdIndex(root).get(relative(root, absFile))

/** Null when the tree is not this root's, the id is absent, or two files claim it. */
export const livePathOf = (root: string, id: string): string | null =>
  liveIndices(root)?.byId.get(id) ?? null

// Walked only when a delete, rename, or restore asks, never on the value writes that rebuild the rest.
export const titlesOf = entityMemo((tree): ReadonlyMap<string, readonly string[]> => {
  const byTitle = new Map<string, string[]>()
  for (const path of indicesOf(tree).byPath.keys()) {
    const title = normalizeTitle(titleFromPath(path))
    const paths = byTitle.get(title)
    if (paths) paths.push(path)
    else byTitle.set(title, [path])
  }
  return byTitle
})

/** Whether a page outside `rel` still answers `title`, so a link naming it resolves once `rel` is gone. */
export function titleHeldOutside(root: string, title: string, rel: string): boolean {
  const tree = heldTreeOf(root)
  if (!tree) return false
  return (titlesOf(tree).get(normalizeTitle(title)) ?? []).some(
    (path) => path !== rel && !path.startsWith(`${rel}/`),
  )
}

/** A restore's world: the pages the tree holds, and those landing with it. */
export function frozenWorld(tree: NexusTree, landing: readonly string[] = []): Frozen {
  const held = titlesOf(tree)
  const arriving = new Set(landing.map(normalizeTitle))
  return {
    holds: (title) => {
      const key = normalizeTitle(title)
      return held.has(key) || arriving.has(key)
    },
  }
}
