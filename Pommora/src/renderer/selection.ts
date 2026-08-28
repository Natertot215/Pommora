// After a mutation refetch, the prior selection can be stale: the entity was deleted (its id is
// gone) or renamed/moved (its id survives but its path changed).

import type { NexusTree, SelectionState } from '@shared/types'
import { reconcileIndexOf } from './treeIndex'

/** Existence + live-path lookup per entity kind — projected from the tree's records once per push. */
export interface ReconcileIndex {
  spaces: ReadonlySet<string>
  collections: ReadonlySet<string>
  sets: ReadonlyMap<string, string>
  pages: ReadonlyMap<string, string>
}

/** Returns the SAME reference when nothing changed, so callers can skip a redundant state update. */
export function reconcileWith(index: ReconcileIndex, selection: SelectionState): SelectionState {
  switch (selection.kind) {
    case 'none':
    case 'homepage':
      // Homepage is a singleton (always present).
      return selection
    case 'context':
      // A Context group is a disclosure — its Spaces are what open. A stored
      // group ref reconciles dead so no layer holds a ref nothing can render.
      return { kind: 'none' }
    case 'space':
      return index.spaces.has(selection.id) ? selection : { kind: 'none' }
    case 'collection':
      return index.collections.has(selection.id) ? selection : { kind: 'none' }
    case 'set': {
      const path = index.sets.get(selection.id)
      if (path === undefined) return { kind: 'none' }
      return path === selection.path ? selection : { kind: 'set', id: selection.id, path }
    }
    case 'page': {
      const path = index.pages.get(selection.id)
      if (path === undefined) return { kind: 'none' }
      return path === selection.path ? selection : { kind: 'page', id: selection.id, path }
    }
  }
}

/** One-shot reconcile (a single selection against a tree) — the index behind it is cached per
 *  tree, so this is a lookup, never a walk. */
export function reconcileSelection(tree: NexusTree, selection: SelectionState): SelectionState {
  return reconcileWith(reconcileIndexOf(tree), selection)
}
