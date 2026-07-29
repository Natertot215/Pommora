// The ONE identity seam between the tree's context data and every surface: memoized
// per-tree accessors resolving a Context id → its title/singular/icon and a Space id →
// its title/icon/color. Resolve through here rather than walking the tree: a Context's icon and a
// Space's icon+color then render identically everywhere by construction.
// Pure: no fs, no React.

import type { NexusTree } from '@shared/types'
import { entityIcon } from '@renderer/design-system/symbols'

export interface ContextIdentity {
  title: string
  /** Seeded Contexts only (Areas/Topics/Projects) — any other Context has none; its Spaces
   *  read "New Space". */
  singular?: string
  /** Always renderable — the entry's own icon, else the contexts default. */
  icon: string
}

export interface SpaceIdentity {
  title: string
  /** Always renderable — the entry's own icon, else the contexts default. */
  icon: string
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
    // The user's Space glyph, not the curated seed: personalization rides the tree, so a surface
    // resolving through this seam lands on the same icon the sidebar shows. Resolving without the
    // overrides is what let a personalized nexus wear one glyph in the sidebar and another in a
    // table chip. The memo keys on the tree, so a settings change invalidates with the push.
    const di = tree.personalization?.defaultIcons
    const contexts = new Map<string, ContextIdentity>()
    const spaces = new Map<string, SpaceIdentity>()
    for (const g of tree.contexts ?? []) {
      contexts.set(g.def.id, {
        title: g.def.title,
        singular: g.def.singular,
        icon: entityIcon('space', g.def.icon, di),
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

/** Every registry Context id, in registry (display) order. */
export function contextIdsOf(tree: NexusTree | null): string[] {
  return tree ? mapsFor(tree).contextIds : []
}

export function contextIdentityOf(tree: NexusTree | null, id: string): ContextIdentity | undefined {
  return tree ? mapsFor(tree).contexts.get(id) : undefined
}

/** Every Context id → its identity. Hand this to a surface that must label Context columns but
 *  can't hold the tree — a memoized row would re-render on every unrelated tree push. */
export function contextsByIdOf(tree: NexusTree | null): ReadonlyMap<string, ContextIdentity> {
  return tree ? mapsFor(tree).contexts : new Map()
}

export function spaceIdentityOf(tree: NexusTree | null, id: string): SpaceIdentity | undefined {
  return tree ? mapsFor(tree).spaces.get(id) : undefined
}

/** Every Space id → its identity, across every registry Context — the map cell renders hold and
 *  read per row, so it hands back the memoized map rather than a per-call copy. */
export function spacesByIdOf(tree: NexusTree): ReadonlyMap<string, SpaceIdentity> {
  return mapsFor(tree).spaces
}

/** True when `id` names a registry Context — the column-kind test every pipeline seam shares. */
export function isContextColumnId(tree: NexusTree | null, id: string): boolean {
  return tree ? mapsFor(tree).contexts.has(id) : false
}
