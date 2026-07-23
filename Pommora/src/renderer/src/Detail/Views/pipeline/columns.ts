// Column resolver. A schema property OR a context column shows iff it's in propertyOrder AND
// not hidden — one allowlist, so a property added to a collection after a view already exists
// AND a Context created after the view stay hidden until the user reveals them (creation never
// visually changes an existing view). Title is always guaranteed. React divergences: emits only
// {id, kind} — column width and the group/sort hoist before Title are Part-2 render concerns;
// and `_modified_at` is NOT default-on (it appears only when explicitly in propertyOrder).
// Pure: no fs, no React.

import type { ColumnKind, ResolvedColumn } from '@shared/types'
import type { SavedView } from '@shared/views'
import { type PropertyDefinition, RESERVED_PROPERTY_ID } from '@shared/properties'

function columnKind(id: string, contextIds: readonly string[]): ColumnKind {
  switch (id) {
    case RESERVED_PROPERTY_ID.title:
      return 'title'
    case RESERVED_PROPERTY_ID.modifiedAt:
      return 'modified'
    default:
      return contextIds.includes(id) ? 'tier' : 'property'
  }
}

/** Visible property ids: propertyOrder verbatim, hidden skipped, stale ids (a dropped prop_*
 *  reference or a deleted Context) dropped. A column shows ONLY if listed here — never
 *  auto-appended. */
function visibleOrder(
  view: SavedView,
  schema: PropertyDefinition[],
  contextIds: readonly string[],
): string[] {
  const hidden = new Set(view.hidden_properties)
  const emitted = new Set<string>()
  const out: string[] = []
  for (const id of view.property_order) {
    if (hidden.has(id) || emitted.has(id)) continue
    if (
      id === RESERVED_PROPERTY_ID.title ||
      id === RESERVED_PROPERTY_ID.modifiedAt ||
      contextIds.includes(id) ||
      schema.some((d) => d.id === id)
    ) {
      emitted.add(id)
      out.push(id)
    }
  }
  return out
}

/** Resolve a view + schema + the registry Context ids into the ordered columns Part 2
 *  renders: visible order, then a guaranteed front Title (always present, never hidden).
 *  Context columns are default-OFF — they render only when the view's property_order
 *  explicitly reveals them. Emits {id, kind} only. */
export function resolveColumns(
  view: SavedView,
  schema: PropertyDefinition[],
  contextIds: readonly string[] = [],
): ResolvedColumn[] {
  const result: ResolvedColumn[] = visibleOrder(view, schema, contextIds).map((id) => ({
    id,
    kind: columnKind(id, contextIds),
  }))
  if (!result.some((c) => c.id === RESERVED_PROPERTY_ID.title)) {
    result.unshift({ id: RESERVED_PROPERTY_ID.title, kind: 'title' })
  }
  return result
}
