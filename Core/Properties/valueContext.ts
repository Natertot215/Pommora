import type { AssetMap } from '../Nexus/tree'
import type { PropertyDefinition } from './properties'
import type { ContextIdentity, IdentityMaps, SpaceIdentity } from '../Contexts/contextIdentity'

export interface ValueContext {
  schema: PropertyDefinition[]
  contextsById: ReadonlyMap<string, SpaceIdentity>
  contexts: ReadonlyMap<string, ContextIdentity>
  /** Held on the context rather than read per cell, so one subscription serves the whole view instead of one per rendered value. */
  assets: AssetMap
}

export function buildValueContext(
  identity: IdentityMaps,
  schema: PropertyDefinition[],
  assets: AssetMap,
): ValueContext {
  return { schema, contextsById: identity.spaces, contexts: identity.contexts, assets }
}
