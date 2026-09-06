// Both askers read the tree index's one walk — the card's Move To ▸, which relocates a live page by path, and the trash's Restore ▸, which files a returning one by id — so the two menus can never disagree about what the nexus will hold.

import type { MoveTarget } from '@pommora/core/Actions/pageMenu'
import { contextDirRel } from '@pommora/core/Locations/nexusPaths'
import type { NexusTree } from '@pommora/core/Nexus/tree'
import { nodesOf } from './treeIndex'

/** The matrix is the write path's: a page or Set lands in a container and nowhere else. */
export function containerTargets(tree: NexusTree | null): MoveTarget[] {
  if (!tree) return []
  const roots: MoveTarget[] = []
  const byId = new Map<string, MoveTarget>()
  for (const r of nodesOf(tree)) {
    if (r.kind !== 'collection' && r.kind !== 'set') continue
    const target: MoveTarget = { id: r.id, label: r.title, path: r.path, children: [] }
    byId.set(r.id, target)
    const parent = r.parents.at(-1)
    ;((parent && byId.get(parent.id)?.children) || roots).push(target)
  }
  return roots
}

/** Flat by construction: no Context parents another, so a Space's destinations are the registry in its own order and there is no tree to walk. */
export function contextTargets(tree: NexusTree | null): MoveTarget[] {
  return (tree?.contexts ?? []).map((g) => ({
    id: g.def.id,
    label: g.def.title,
    path: contextDirRel(g.def.title),
  }))
}
