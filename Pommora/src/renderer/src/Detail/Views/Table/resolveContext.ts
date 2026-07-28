import type { NexusLabels, NexusTree } from '@shared/types'
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
}

export function buildResolveContext(tree: NexusTree, schema: PropertyDefinition[]): ResolveContext {
  return {
    schema,
    contextsById: spacesByIdOf(tree),
    contexts: contextsByIdOf(tree),
    labels: tree.labels,
  }
}
