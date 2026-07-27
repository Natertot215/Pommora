// The resolution context threaded into table cells + group headers so they turn ids into human values
// at render: the container schema (property names + option labels), the identity seam's Space map
// (id → title + color + icon), and the per-Nexus labels. Built once per table render from the tree;
// pure — no fs, no React.

import type { NexusLabels, NexusTree } from '@shared/types'
import type { PropertyDefinition } from '@shared/properties'
import {
  type ContextIdentity,
  contextsByIdOf,
  type SpaceIdentity,
  spacesByIdOf,
} from '../pipeline/contextIdentity'

/** Everything a table cell / group header needs to resolve ids → human values at render. */
export interface ResolveContext {
  schema: PropertyDefinition[]
  contextsById: ReadonlyMap<string, SpaceIdentity>
  /** Context id → identity, for labelling a Context column without holding the tree. */
  contexts: ReadonlyMap<string, ContextIdentity>
  labels: NexusLabels
}

/** Assemble the full resolution context from the tree + the container's (effective) schema. */
export function buildResolveContext(tree: NexusTree, schema: PropertyDefinition[]): ResolveContext {
  return {
    schema,
    contextsById: spacesByIdOf(tree),
    contexts: contextsByIdOf(tree),
    labels: tree.labels,
  }
}
