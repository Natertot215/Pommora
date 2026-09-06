// One allowlist — in propertyOrder AND not hidden — so a property or Context created after a view stays hidden until the user reveals it: creation never visually changes an existing view.

import type { ColumnKind, ResolvedColumn } from '@pommora/core/Views/viewRow'
import type { SavedView } from '@pommora/core/Views/views'
import {
  type PropertyDefinition,
  RESERVED_PROPERTY_ID,
  STAMP_TYPE,
} from '@pommora/core/Properties/properties'

function columnKind(id: string, contextIds: readonly string[]): ColumnKind {
  if (id === RESERVED_PROPERTY_ID.title) return 'title'
  if (STAMP_TYPE[id]) return 'stamp'
  return contextIds.includes(id) ? 'context' : 'property'
}

/** Stale ids are dropped — only a 'property' kind can be stale, since every other kind is the classification itself. */
function visibleColumns(
  view: SavedView,
  schema: PropertyDefinition[],
  contextIds: readonly string[],
): ResolvedColumn[] {
  const hidden = new Set(view.hidden_properties)
  const emitted = new Set<string>()
  const out: ResolvedColumn[] = []
  for (const id of view.property_order) {
    if (hidden.has(id) || emitted.has(id)) continue
    const kind = columnKind(id, contextIds)
    if (kind === 'property' && !schema.some((d) => d.id === id)) continue
    emitted.add(id)
    out.push({ id, kind })
  }
  return out
}

/** Context columns are default-OFF — they render only when the view's property_order explicitly reveals them. */
export function resolveColumns(
  view: SavedView,
  schema: PropertyDefinition[],
  contextIds: readonly string[] = [],
): ResolvedColumn[] {
  const result = visibleColumns(view, schema, contextIds)
  if (!result.some((c) => c.id === RESERVED_PROPERTY_ID.title)) {
    result.unshift({ id: RESERVED_PROPERTY_ID.title, kind: 'title' })
  }
  return result
}
