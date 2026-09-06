import type { AssetMap, NexusTree } from '@pommora/core/Nexus/tree'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import {
  type ContextIdentity,
  contextsByIdOf,
  type SpaceIdentity,
  spacesByIdOf,
} from './contextIdentity'

export interface ValueContext {
  schema: PropertyDefinition[]
  contextsById: ReadonlyMap<string, SpaceIdentity>
  contexts: ReadonlyMap<string, ContextIdentity>
  /** Held on the context rather than read per cell, so one subscription serves the whole view instead of one per rendered value. */
  assets: AssetMap
}

export function buildValueContext(
  tree: NexusTree,
  schema: PropertyDefinition[],
  assets: AssetMap,
): ValueContext {
  return {
    schema,
    contextsById: spacesByIdOf(tree),
    contexts: contextsByIdOf(tree),
    assets,
  }
}
