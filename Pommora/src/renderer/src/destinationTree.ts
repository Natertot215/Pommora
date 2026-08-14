// Where an entity may be sent. One walk serves both askers — the card's Move To ▸, which relocates
// a live page by path, and the trash's Restore ▸, which files a returning one by id — so the two
// menus can never disagree about what the nexus will hold.

import type { MoveTarget } from '@shared/cardMenu'
import type { CollectionNode, NexusTree, SetNode } from '@shared/types'

/** Every Collection and the Sets nested under it, in tree order. The matrix is the write path's:
 *  a page or Set lands in a container and nowhere else. */
export function containerTargets(collections: CollectionNode[]): MoveTarget[] {
  const walk = (nodes: (CollectionNode | SetNode)[] | undefined): MoveTarget[] =>
    (nodes ?? []).map((n) => ({
      id: n.id,
      label: n.title,
      path: n.path,
      children: walk(n.sets),
    }))
  return walk(collections)
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
