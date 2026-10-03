// After a mutation refetch the prior selection can be stale: the entity was deleted (its id is gone) or renamed/moved (its id survives but its path changed).

import type { NexusTree } from '../Nexus/tree'
import type { SelectionState } from '../Navigation/navRef'
import { reconcileIndexOf } from '../Nexus/treeIndex'
import { sameItems } from '@pommora/uix/Utilities/same'

export interface ReconcileIndex {
  spaces: ReadonlySet<string>
  collections: ReadonlySet<string>
  sets: ReadonlyMap<string, string>
  pages: ReadonlyMap<string, string>
  pagesByPath: ReadonlyMap<string, string>
  withheld: (path: string) => boolean
}

/** Returns the SAME reference when nothing changed, so callers can skip a redundant state update. */
export function reconcileWith(index: ReconcileIndex, selection: SelectionState): SelectionState {
  switch (selection.kind) {
    case 'none':
    case 'homepage':
    case 'matrix':
      return selection
    case 'space':
      return index.spaces.has(selection.id) ? selection : { kind: 'none' }
    case 'collection':
      return index.collections.has(selection.id) ? selection : { kind: 'none' }
    case 'set': {
      const path = index.sets.get(selection.id)
      if (path === undefined) return index.withheld(selection.path) ? selection : { kind: 'none' }
      return path === selection.path ? selection : { kind: 'set', id: selection.id, path }
    }
    case 'page': {
      const path = index.pages.get(selection.id)
      if (path === undefined) {
        if (index.withheld(selection.path)) return selection
        const id = index.pagesByPath.get(selection.path)
        return id === undefined ? { kind: 'none' } : { kind: 'page', id, path: selection.path }
      }
      return path === selection.path ? selection : { kind: 'page', id: selection.id, path }
    }
  }
}

/** The index behind it is cached per tree, so this is a lookup, never a walk. */
export function reconcileSelection(tree: NexusTree, selection: SelectionState): SelectionState {
  return reconcileWith(reconcileIndexOf(tree), selection)
}

/** The same array comes back when every item maps to itself, so a caller can skip its write. */
export function reconcileHeld<T>(
  items: T[],
  map: (item: T) => T | null,
): { next: T[]; dropped: T[] } {
  const next: T[] = []
  const dropped: T[] = []
  for (const item of items) {
    const kept = map(item)
    if (kept === null) dropped.push(item)
    else next.push(kept)
  }
  return { next: sameItems(next, items) ? items : next, dropped }
}
