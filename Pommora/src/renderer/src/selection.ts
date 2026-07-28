// After a mutation refetch, the prior selection can be stale: the entity was deleted (its id is
// gone) or renamed/moved (its id survives but its path changed).

import type {
  CollectionNode,
  NexusTree,
  PageNode,
  SelectionState,
  SetNode,
  SpaceNode,
} from '@shared/types'

/** Every top Collection across ungrouped + user sections. */
export function allCollections(tree: NexusTree): CollectionNode[] {
  return [...(tree.collections ?? []), ...tree.userSections.flatMap((s) => s.collections ?? [])]
}

export interface FlatTree {
  collections: CollectionNode[]
  sets: SetNode[]
  pages: PageNode[]
  spaces: SpaceNode[]
}

/** One recursive walk yielding every flattened list. Per-kind helpers stacked together each re-walk
 *  from the Collections down, and every caller here wants three of them at once. */
export function flattenTree(tree: NexusTree): FlatTree {
  const collections = allCollections(tree)
  const sets: SetNode[] = []
  const walk = (list: SetNode[] | undefined): void => {
    for (const s of list ?? []) {
      sets.push(s)
      walk(s.sets)
    }
  }
  for (const c of collections) walk(c.sets)
  return {
    collections,
    sets,
    pages: [...collections.flatMap((c) => c.pages), ...sets.flatMap((s) => s.pages)],
    spaces: (tree.contexts ?? []).flatMap((g) => g.spaces),
  }
}

/** Reusable across many reconciles — `applyTree` builds this ONCE per push instead of a per-call tree walk. */
export interface ReconcileIndex {
  contexts: ReadonlySet<string>
  collections: ReadonlySet<string>
  sets: ReadonlyMap<string, string>
  pages: ReadonlyMap<string, string>
}

export function buildReconcileIndex(tree: NexusTree): ReconcileIndex {
  const { collections, sets, pages, spaces } = flattenTree(tree)
  return {
    contexts: new Set(spaces.map((c) => c.id)),
    collections: new Set(collections.map((c) => c.id)),
    sets: new Map(sets.map((s) => [s.id, s.path])),
    pages: new Map(pages.map((p) => [p.id, p.path])),
  }
}

/** Returns the SAME reference when nothing changed, so callers can skip a redundant state update. */
export function reconcileWith(index: ReconcileIndex, selection: SelectionState): SelectionState {
  switch (selection.kind) {
    case 'none':
    case 'homepage':
      // Homepage is a singleton (always present) — never reconciled away.
      return selection
    case 'context':
    case 'space':
      return index.contexts.has(selection.id) ? selection : { kind: 'none' }
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

/** One-shot reconcile (a single selection against a tree) — Back/Forward steps and click-time pin
 *  resolution. Anything reconciling MANY refs per push builds the index once instead. */
export function reconcileSelection(tree: NexusTree, selection: SelectionState): SelectionState {
  return reconcileWith(buildReconcileIndex(tree), selection)
}
