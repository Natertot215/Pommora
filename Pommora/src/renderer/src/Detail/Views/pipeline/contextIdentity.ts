// The ONE identity seam between the tree's context data and every surface: memoized
// per-tree accessors resolving a Context id → its title/singular/icon and a Space id →
// its title/icon/color. No surface re-derives these from the tree on its own — a
// Context's icon and a Space's icon+color render identically everywhere by construction.
// Pure: no fs, no React.

import type { NexusTree } from '@shared/types'

export interface ContextIdentity {
  title: string
  singular: string
  icon?: string
}

export interface SpaceIdentity {
  title: string
  icon?: string
  /** Chip-solid key (open string; chipColorFor normalizes at render). */
  color?: string
  contextId: string
}

interface IdentityMaps {
  contextIds: string[]
  contexts: Map<string, ContextIdentity>
  spaces: Map<string, SpaceIdentity>
}

// Keyed on the tree object — a tree push naturally invalidates.
const mapsByTree = new WeakMap<NexusTree, IdentityMaps>()

function mapsFor(tree: NexusTree): IdentityMaps {
  let maps = mapsByTree.get(tree)
  if (!maps) {
    const contexts = new Map<string, ContextIdentity>()
    const spaces = new Map<string, SpaceIdentity>()
    for (const g of tree.contextGroups ?? []) {
      contexts.set(g.def.id, { title: g.def.title, singular: g.def.singular, icon: g.def.icon })
      for (const s of g.spaces) {
        spaces.set(s.id, { title: s.title, icon: s.icon, color: s.color, contextId: g.def.id })
      }
    }
    maps = { contextIds: [...contexts.keys()], contexts, spaces }
    mapsByTree.set(tree, maps)
  }
  return maps
}

/** Every registry Context id, in registry (display) order. */
export function contextIdsOf(tree: NexusTree | null): string[] {
  return tree ? mapsFor(tree).contextIds : []
}

export function contextIdentityOf(tree: NexusTree | null, id: string): ContextIdentity | undefined {
  return tree ? mapsFor(tree).contexts.get(id) : undefined
}

export function spaceIdentityOf(tree: NexusTree | null, id: string): SpaceIdentity | undefined {
  return tree ? mapsFor(tree).spaces.get(id) : undefined
}

/** True when `id` names a registry Context — the column-kind test every pipeline seam shares. */
export function isContextColumnId(tree: NexusTree | null, id: string): boolean {
  return tree ? mapsFor(tree).contexts.has(id) : false
}
