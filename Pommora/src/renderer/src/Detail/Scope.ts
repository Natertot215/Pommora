import type { CollectionNode, NexusTree, SetNode } from '@shared/types'
import type { BannerOwnerKind } from '@shared/mutate'

/** `icon` is the entity's raw stored value, unvalidated — the Banner component falls back per
 *  kind at render. NavView wears its own banner treatment, so it's excluded here. */
export interface BannerOwner {
  path: string
  kind: Exclude<BannerOwnerKind, 'navview'>
  name: string
  banner?: string
  icon?: string
  /** The banner-heading icon is hidden (show/hide). Absent/false = shown. */
  headingIconHidden?: boolean
}

function allCollections(tree: NexusTree): CollectionNode[] {
  return tree.collections ?? []
}

export function findCollection(tree: NexusTree | null, id: string): CollectionNode | undefined {
  if (!tree) return undefined
  return allCollections(tree).find((c) => c.id === id)
}

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

/** The Collection that owns a Set's inherited schema — a Set has no properties schema of its own. */
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

/** Block-based surface kinds (homepage + Spaces) run tight tile gutters instead of the page/table
 *  content inset — the tile handles supply their own grip/chevron actions, so no reserved lane
 *  is needed. Drives `is-surface`. */
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
