// The held tree's pages by path and by id, for the host's writers; titles answer from the one index.

import { heldTreeOf } from './liveTree'
import { isAtOrUnder, relative } from '../Paths/posix'
import { normalizeTitle } from '../Paths/caseFold'
import type { Frozen } from '../Properties/propertyValue'
import { pageIndexOf, pagesOf } from './record'
import { entityMemo, type NexusTree } from './tree'

interface PageIndices {
  byPath: ReadonlyMap<string, string>
  /** null marks an id two files claim. */
  byId: ReadonlyMap<string, string | null>
}

const indicesOf = entityMemo([], (tree): PageIndices => {
  const byPath = new Map<string, string>()
  const byId = new Map<string, string | null>()
  for (const p of pagesOf(tree)) {
    byPath.set(p.path, p.id)
    byId.set(p.id, byId.has(p.id) ? null : p.path)
  }
  return { byPath, byId }
})

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

export const idHeld = (root: string, id: string): boolean =>
  liveIndices(root)?.byId.has(id) ?? false

/** Whether a page outside `rel` still answers `title`, so a link naming it resolves once `rel` is gone. */
export function titleHeldOutside(root: string, title: string, rel: string): boolean {
  const tree = heldTreeOf(root)
  if (!tree) return false
  return pageIndexOf(tree)
    .holders(title)
    .some((p) => !isAtOrUnder(p.path, rel))
}

/** A restore's world: the pages the tree holds, and those landing with it. */
export function frozenWorld(tree: NexusTree, landing: readonly string[] = []): Frozen {
  const index = pageIndexOf(tree)
  const arriving = new Set(landing.map(normalizeTitle))
  return {
    holds: (title) => index.holders(title).length > 0 || arriving.has(normalizeTitle(title)),
  }
}
