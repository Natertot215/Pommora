// The held tree's pages by path and by id, for the host's writers.

import { heldTreeOf } from './liveTree'
import { relative } from '../Paths/posix'
import { pagesByPathOf, pagesOf } from './record'
import { entityMemo } from './tree'

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
