import type { NexusTree } from '../Nexus/tree'
import { entityIcon } from '../Assets/entityIconPolicy'
import type { Personalization } from '../Settings/personalization'

export interface ContextIdentity {
  title: string
  singular?: string
  icon: string
  spaceIds: string[]
}

export interface SpaceIdentity {
  title: string
  icon: string
  color?: string
  contextId: string
}

export interface IdentityMaps {
  contextIds: string[]
  contexts: ReadonlyMap<string, ContextIdentity>
  spaces: ReadonlyMap<string, SpaceIdentity>
}

// Keyed on the two slices it reads, so a push that leaves the Contexts and the default icons alone keeps every map's identity.
const mapsByContexts = new WeakMap<
  NexusTree['contexts'],
  { icons: Personalization['defaultIcons']; maps: IdentityMaps }
>()

const NO_IDENTITY: IdentityMaps = { contextIds: [], contexts: new Map(), spaces: new Map() }

export function identityOf(tree: NexusTree | null): IdentityMaps {
  if (!tree) return NO_IDENTITY
  // The user's Space glyph, not the curated seed — personalization rides the tree, so every surface resolving through this seam lands on the same icon the sidebar shows.
  const di = tree.config.personalization.defaultIcons
  const held = mapsByContexts.get(tree.contexts)
  if (held && held.icons === di) return held.maps
  const contexts = new Map<string, ContextIdentity>()
  const spaces = new Map<string, SpaceIdentity>()
  for (const g of tree.contexts) {
    contexts.set(g.def.id, {
      title: g.def.title,
      singular: g.def.singular,
      icon: entityIcon('context', g.def.icon, di),
      spaceIds: g.spaces.map((s) => s.id),
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
  const maps = { contextIds: [...contexts.keys()], contexts, spaces }
  mapsByContexts.set(tree.contexts, { icons: di, maps })
  return maps
}

export function contextIdsOf(tree: NexusTree | null): string[] {
  return identityOf(tree).contextIds
}

/** Hand this to a surface that must label Context columns but can't hold the tree — a memoized row would re-render on every unrelated tree push. */
export function contextsByIdOf(tree: NexusTree | null): ReadonlyMap<string, ContextIdentity> {
  return identityOf(tree).contexts
}

export function spaceIdentityOf(tree: NexusTree | null, id: string): SpaceIdentity | undefined {
  return identityOf(tree).spaces.get(id)
}

export function spacesByIdOf(tree: NexusTree | null): ReadonlyMap<string, SpaceIdentity> {
  return identityOf(tree).spaces
}
