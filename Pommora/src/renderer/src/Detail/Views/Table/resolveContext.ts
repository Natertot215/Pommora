// The resolution context threaded into table cells + group headers so they turn ids into human values
// at render: the container schema (property names + option labels), a Space-id lookup
// (context values → title + color + icon), and the per-Nexus labels. Built once per table render
// from the tree; pure — no fs, no React.

import type { NexusLabels, NexusTree } from '@shared/types'
import type { PropertyDefinition } from '@shared/properties'
import { defaultEntityIcon, iconNameOr } from '@renderer/design-system/symbols'

/** A resolved Space reference for a context cell — its title, chip color, and the icon its
 *  chip wears (the Space's own override, else the contexts default — always a renderable id). */
export interface ContextRef {
  title: string
  /** Chip-solid key (open string; chipColorFor normalizes at render). */
  color?: string
  icon: string
}

/** Everything a table cell / group header needs to resolve ids → human values at render. */
export interface ResolveContext {
  schema: PropertyDefinition[]
  contextsById: Map<string, ContextRef>
  labels: NexusLabels
}

/** Space id → {title, color, icon} across every registry Context (the legacy fixed-three
 *  struct feeds the same map on a tree without groups). */
export function buildContextsById(tree: NexusTree): Map<string, ContextRef> {
  const m = new Map<string, ContextRef>()
  for (const g of tree.contextGroups ?? []) {
    for (const s of g.spaces) {
      m.set(s.id, {
        title: s.title,
        color: s.color,
        icon: iconNameOr(s.icon, defaultEntityIcon('space')),
      })
    }
  }
  return m
}

/** Assemble the full resolution context from the tree + the container's (effective) schema. */
export function buildResolveContext(tree: NexusTree, schema: PropertyDefinition[]): ResolveContext {
  return { schema, contextsById: buildContextsById(tree), labels: tree.labels }
}
