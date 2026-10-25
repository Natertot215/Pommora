// One allowlist — in propertyOrder AND not hidden — so a property or Context created after a view stays hidden until the user reveals it: creation never visually changes an existing view.

import type { ResolvedColumn } from '../viewRow'
import type { SavedView } from '../views'
import { FILEDATA, FILEDATA_BY_ID, type PropertyDefinition } from '../../Properties/properties'

const TITLE: ResolvedColumn = { id: FILEDATA.title.id, kind: 'title', type: 'title' }

export const propertyColumn = (def: PropertyDefinition): ResolvedColumn => ({
  id: def.id,
  kind: 'property',
  type: def.type,
  def,
})

export const contextColumn = (id: string): ResolvedColumn => ({
  id,
  kind: 'context',
  type: 'context',
})

/** The one classification of a column id, done once per view pass; nothing for Location, which is never a column, or for an id neither the schema nor the registry holds. */
export function resolveColumn(
  id: string,
  schema: PropertyDefinition[],
  contextIds: readonly string[],
): ResolvedColumn | undefined {
  if (id === TITLE.id) return TITLE
  const stamp = FILEDATA_BY_ID.get(id)?.type
  if (stamp) return { id, kind: 'stamp', type: stamp }
  if (contextIds.includes(id)) return contextColumn(id)
  const def = schema.find((d) => d.id === id)
  return def && propertyColumn(def)
}

/** Context columns are default-OFF — they render only when the view's property_order explicitly reveals them. */
export function resolveColumns(
  view: SavedView,
  schema: PropertyDefinition[],
  contextIds: readonly string[],
): ResolvedColumn[] {
  const hidden = new Set(view.hidden_properties)
  const columns = new Map<string, ResolvedColumn>()
  for (const id of view.property_order) {
    if (hidden.has(id) || columns.has(id)) continue
    const column = resolveColumn(id, schema, contextIds)
    if (column) columns.set(id, column)
  }
  return columns.has(TITLE.id) ? [...columns.values()] : [TITLE, ...columns.values()]
}
