// The held tree's pages by path and by id, for the host's writers; titles answer from the one index.

import { heldTreeOf } from './liveTree'
import { isAtOrUnder, relative } from '../Paths/posix'
import { normalizeTitle } from '../Paths/caseFold'
import type { Frozen } from '../Properties/propertyValue'
import { pageIndexOf, pagesByPathOf, pagesOf } from './record'
import { entityMemo, type NexusTree } from './tree'

/** Null marks an id two files claim: the window shows the first listed (`record.ts`'s `pagesByIdOf`); a file writer refuses it. */
const writablePathsOf = entityMemo([], (tree): ReadonlyMap<string, string | null> => {
  const byId = new Map<string, string | null>()
  for (const p of pagesOf(tree)) byId.set(p.id, byId.has(p.id) ? null : p.path)
  return byId
})

/** Empty when the tree is not this root's, so a stale tree never names ids for another nexus. */
export const liveIdIndex = (root: string): ReadonlyMap<string, string> => {
  const tree = heldTreeOf(root)
  return tree ? pagesByPathOf(tree) : new Map()
}

export const liveIdOf = (root: string, absFile: string): string | undefined =>
  liveIdIndex(root).get(relative(root, absFile))

/** Null when the tree is not this root's, the id is absent, or two files claim it. */
export const livePathOf = (root: string, id: string): string | null => {
  const tree = heldTreeOf(root)
  return tree ? (writablePathsOf(tree).get(id) ?? null) : null
}

export const idHeld = (root: string, id: string): boolean => {
  const tree = heldTreeOf(root)
  return tree ? writablePathsOf(tree).has(id) : false
}

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
