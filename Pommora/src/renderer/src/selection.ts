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

/** Every Set at any depth under the tree's Collections (the recursive flatten). */
export function allSets(tree: NexusTree): SetNode[] {
  const out: SetNode[] = []
  const walk = (sets: SetNode[] | undefined): void => {
    for (const s of sets ?? []) {
      out.push(s)
      walk(s.sets)
    }
  }
  for (const c of allCollections(tree)) walk(c.sets)
  return out
}

/** Every page in the tree (Collection-direct + every nested Set's pages). */
export function allPages(tree: NexusTree): PageNode[] {
  const pages: PageNode[] = []
  for (const c of allCollections(tree)) pages.push(...c.pages)
  for (const s of allSets(tree)) pages.push(...s.pages)
  return pages
}

/** Every Space across every registry Context, in display order. */
export function allSpaces(tree: NexusTree): SpaceNode[] {
  return (tree.contexts ?? []).flatMap((g) => g.spaces)
}

/** Reusable across many reconciles — `applyTree` builds this ONCE per push instead of a per-call tree walk. */
export interface ReconcileIndex {
  contexts: ReadonlySet<string>
  collections: ReadonlySet<string>
  sets: ReadonlyMap<string, string>
  pages: ReadonlyMap<string, string>
}

export function buildReconcileIndex(tree: NexusTree): ReconcileIndex {
  return {
    contexts: new Set(allSpaces(tree).map((c) => c.id)),
    collections: new Set(allCollections(tree).map((c) => c.id)),
    sets: new Map(allSets(tree).map((s) => [s.id, s.path])),
    pages: new Map(allPages(tree).map((p) => [p.id, p.path])),
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
