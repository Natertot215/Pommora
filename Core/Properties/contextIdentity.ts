import type { NexusTree } from '@pommora/core/Nexus/tree'
import { entityIcon } from '../Assets/entityIconPolicy'

export interface ContextIdentity {
  title: string
  singular?: string
  icon: string
}

export interface SpaceIdentity {
  title: string
  icon: string
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
    // The user's Space glyph, not the curated seed — personalization rides the tree, so every surface resolving through this seam lands on the same icon the sidebar shows.
    const di = tree.personalization.defaultIcons
    const contexts = new Map<string, ContextIdentity>()
    const spaces = new Map<string, SpaceIdentity>()
    for (const g of tree.contexts) {
      contexts.set(g.def.id, {
        title: g.def.title,
        singular: g.def.singular,
        icon: entityIcon('context', g.def.icon, di),
      })
      for (const s of g.spaces) {
        spaces.set(s.id, {
          title: s.title,
          icon: entityIcon('space', s.icon, di),
          color: s.color,
          contextId: g.def.id,
        })
      }
    }
    maps = { contextIds: [...contexts.keys()], contexts, spaces }
    mapsByTree.set(tree, maps)
  }
  return maps
}

export function contextIdsOf(tree: NexusTree | null): string[] {
  return tree ? mapsFor(tree).contextIds : []
}

export function contextIdentityOf(tree: NexusTree | null, id: string): ContextIdentity | undefined {
  return tree ? mapsFor(tree).contexts.get(id) : undefined
}

/** Hand this to a surface that must label Context columns but can't hold the tree — a memoized row would re-render on every unrelated tree push. */
export function contextsByIdOf(tree: NexusTree | null): ReadonlyMap<string, ContextIdentity> {
  return tree ? mapsFor(tree).contexts : new Map()
}

export function spaceIdentityOf(tree: NexusTree | null, id: string): SpaceIdentity | undefined {
  return tree ? mapsFor(tree).spaces.get(id) : undefined
}

export function spacesByIdOf(tree: NexusTree): ReadonlyMap<string, SpaceIdentity> {
  return mapsFor(tree).spaces
}

export function isContextColumnId(tree: NexusTree | null, id: string): boolean {
  return tree ? mapsFor(tree).contexts.has(id) : false
}
