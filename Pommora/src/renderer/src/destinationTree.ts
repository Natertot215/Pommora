// Where an entity may be sent. One walk serves both askers — the card's Move To ▸, which relocates
// a live page by path, and the trash's Restore ▸, which files a returning one by id — so the two
// menus can never disagree about what the nexus will hold.

import type { MoveTarget } from '@shared/cardMenu'
import type { CollectionNode, NexusTree, SetNode } from '@shared/types'

/** Every Collection and the Sets nested under it, in tree order. The matrix is the write path's:
 *  a page or Set lands in a container and nowhere else. */
export function containerTargets(collections: CollectionNode[]): MoveTarget[] {
  const walkSets = (sets: SetNode[] | undefined): MoveTarget[] =>
    (sets ?? []).map((set) => ({
      id: set.id,
      label: set.title,
      path: set.path,
      children: walkSets(set.sets),
    }))
  return collections.map((c) => ({
    id: c.id,
    label: c.title,
    path: c.path,
    children: walkSets(c.sets),
  }))
}

/** Flat by construction: no Context parents another, so a Space's destinations are the registry
 *  in its own order and there is no tree to walk. */
export function contextTargets(tree: NexusTree | null): MoveTarget[] {
  return (tree?.contexts ?? []).map((g) => ({
    id: g.def.id,
    label: g.def.title,
    path: `.nexus/contexts/${g.def.title}`,
  }))
}
