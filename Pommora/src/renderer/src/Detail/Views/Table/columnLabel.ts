// Renderer-side resolution of a column id → its human header label. User properties
// resolve through the stored schema; context columns through the registry (the contextIdentity
// seam); built-in reserved columns carry fixed labels. An unknown id (a stale prop_* reference)
// falls back to the id itself, never throwing — a single bad column never breaks the header row.

import type { NexusLabels, NexusTree } from '@shared/types'
import { type PropertyDefinition, RESERVED_PROPERTY_ID } from '@shared/properties'
import { contextIdentityOf } from '../pipeline/contextIdentity'

// Tier level (1 = Area, 2 = Topic, 3 = Project) → the NexusLabels key holding its LabelPair.
const TIER_LABEL_KEY = ['area', 'topic', 'project'] as const

/** LEGACY — the per-Nexus plural label for a fixed tier; live titles come from the registry. */
/** LEGACY — reserved tier column id → its level; live classification is registry membership. */
// Built-in reserved columns with fixed English labels (context titles are registry data).
const RESERVED_LABEL: Record<string, string> = {
  [RESERVED_PROPERTY_ID.title]: 'Title',
  [RESERVED_PROPERTY_ID.createdAt]: 'Created',
  [RESERVED_PROPERTY_ID.modifiedAt]: 'Modified',
}

/** A column id → its header label: any registry Context via its title, built-ins via fixed
 *  labels, user props via the schema def's `name`, an unknown id via itself (never throws). */
export function columnLabel(
  columnId: string,
  schema: PropertyDefinition[],
  labels: NexusLabels,
  tree: NexusTree | null = null,
): string {
  const ctx = contextIdentityOf(tree, columnId)
  if (ctx) return ctx.title
  return RESERVED_LABEL[columnId] ?? schema.find((d) => d.id === columnId)?.name ?? columnId
}
