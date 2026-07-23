import type { CollectionNode, NexusTree, SetNode } from '@shared/types'
import type { BannerOwnerKind } from '@shared/mutate'

// Resolving a selection to the entity it points at, and the banner owner for any view. The
// renderer's analog of Swift's DetailScope — the seam between "what's selected" and "what renders".

/** A banner-capable view's owner: which entity holds the banner + its current image path. `icon`
 *  is the entity's raw stored value — the banner validates it and falls back per kind at render.
 *  The NavView singleton isn't a Banner-component owner — it wears its own banner treatment. */
export interface BannerOwner {
  path: string
  kind: Exclude<BannerOwnerKind, 'navview'>
  name: string
  banner?: string
  icon?: string
  /** The banner-heading icon is hidden (show/hide). Absent/false = shown. */
  headingIconHidden?: boolean
}

/** Every top Collection across ungrouped + user sections. */
function allCollections(tree: NexusTree): CollectionNode[] {
  return [...(tree.collections ?? []), ...tree.userSections.flatMap((s) => s.collections ?? [])]
}

/** Find a top Collection by id (ungrouped + user sections). */
export function findCollection(tree: NexusTree | null, id: string): CollectionNode | undefined {
  if (!tree) return undefined
  return allCollections(tree).find((c) => c.id === id)
}

/** Find a Set by id at any depth under the tree's Collections (recursive). */
export function findSet(tree: NexusTree | null, id: string): SetNode | undefined {
  if (!tree) return undefined
  const search = (sets: SetNode[] | undefined): SetNode | undefined => {
    for (const s of sets ?? []) {
      if (s.id === id) return s
      const deep = search(s.sets)
      if (deep) return deep
    }
    return undefined
  }
  for (const c of allCollections(tree)) {
    const hit = search(c.sets)
    if (hit) return hit
  }
  return undefined
}

/** The Collection that owns a Set's inherited schema — the top Collection whose set tree contains
 *  `setId` (a Set has no schema of its own; properties live only on the Collection). */
export function findCollectionForSet(
  tree: NexusTree | null,
  setId: string,
): CollectionNode | undefined {
  if (!tree) return undefined
  const has = (sets: SetNode[] | undefined): boolean => {
    for (const set of sets ?? []) {
      if (set.id === setId) return true
      if (has(set.sets)) return true
    }
    return false
  }
  return allCollections(tree).find((c) => has(c.sets))
}

/** Block-based surface kinds (homepage + Spaces): their detail body runs tight tile gutters
 *  (--surface-inset) instead of the page/table content inset + fold-gutter — the tile handles
 *  supply the grip/chevron actions, so no reserved lane is needed. Drives `is-surface`. */
export function isSurfaceKind(kind: BannerOwnerKind): boolean {
  return kind === 'homepage' || kind === 'space'
}

/** Whether a Set is depth-1 — a DIRECT child of a Collection (so it carries + renders views). A
 *  deeper Sub-Set is a plain organizing folder; a reparent + Back-nav replay can surface one as a
 *  `set` selection, so the view paths test this rather than trusting "depth-1 by construction". */
export function isDepth1Set(tree: NexusTree | null, setId: string): boolean {
  const col = findCollectionForSet(tree, setId)
  return !!col && col.sets.some((s) => s.id === setId)
}

/** Resolve a Space id to its banner owner across the registry groups. */
export function findSpace(tree: NexusTree | null, id: string): BannerOwner | null {
  if (!tree) return null
  for (const g of tree.contexts ?? []) {
    const sp = g.spaces.find((s) => s.id === id)
    if (sp)
      return {
        path: sp.path,
        kind: 'space',
        name: sp.title,
        banner: sp.banner,
        icon: sp.icon,
        headingIconHidden: sp.headingIconHidden,
      }
  }
  return null
}

/** The banner owner for a page container (Collection or Set) — same shape; kind from the node. */
export function containerOwner(node: CollectionNode | SetNode): BannerOwner {
  return {
    path: node.path,
    kind: node.kind,
    name: node.title,
    banner: node.banner,
    icon: node.icon,
    headingIconHidden: node.headingIconHidden,
  }
}
