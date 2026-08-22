import type { AssetMap, NexusLabels, NexusTree } from '@shared/types'
import type { PropertyDefinition } from '@shared/properties'
import {
  type ContextIdentity,
  contextsByIdOf,
  type SpaceIdentity,
  spacesByIdOf,
} from '../pipeline/contextIdentity'

export interface ResolveContext {
  schema: PropertyDefinition[]
  contextsById: ReadonlyMap<string, SpaceIdentity>
  /** Context id → identity, for labelling a Context column without holding the tree. */
  contexts: ReadonlyMap<string, ContextIdentity>
  labels: NexusLabels
  /** The basename index a file value resolves against. Held on the context rather than read per
   *  cell, so one subscription serves the whole view instead of one per rendered value. */
  assets: AssetMap
}

export function buildResolveContext(
  tree: NexusTree,
  schema: PropertyDefinition[],
  assets: AssetMap,
): ResolveContext {
  return {
    schema,
    contextsById: spacesByIdOf(tree),
    contexts: contextsByIdOf(tree),
    labels: tree.labels,
    assets,
  }
}
