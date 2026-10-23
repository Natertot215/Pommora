// Two axes that must not be confused: declaredType is the column's SCHEMA type, whose record entry sort, filter and grouping classify by; resolveFieldValue is the row's VALUE, decoded definition-first — never inferred from a value's shape, so a Link column always reads as a link.

import type { ResolvedColumn, ViewRow } from '../Views/viewRow'
import type { PageFrontmatter } from '../Nexus/schemas'
import { type ColumnType, FILEDATA, FILEDATA_BY_ID, type PropertyDefinition } from './properties'
import { decodeValue, NULL_VALUE, type PropertyValue } from './propertyValue'

export function declaredType(
  propertyId: string,
  schema: PropertyDefinition[],
  contextIds: readonly string[] = [],
): ColumnType | undefined {
  const filedata = FILEDATA_BY_ID.get(propertyId)
  if (filedata) return filedata.type
  if (contextIds.includes(propertyId)) return 'context'
  return schema.find((d) => d.id === propertyId)?.type
}

/** A Context column classifies by its resolved column kind, so a surface without the registry ids still reads it as one. */
export const columnType = (
  column: ResolvedColumn,
  schema: PropertyDefinition[],
): ColumnType | undefined =>
  column.kind === 'context' ? 'context' : declaredType(column.id, schema)

const stampValue = (iso: string | null): PropertyValue =>
  iso === null ? NULL_VALUE : { kind: 'dateTime', value: iso }

/** A value a pending write picked stands in until a read retires it. A CONTEXT column bypasses the cache below: its ids resolve at walk assembly onto the row's own `contextValues`. */
export function resolveFieldValue(
  row: ViewRow,
  propertyId: string,
  schema: PropertyDefinition[],
): PropertyValue {
  // Title and the stamps read the row, not the frontmatter the memo is keyed on.
  if (propertyId === FILEDATA.title.id) return { kind: 'text', value: row.title }
  if (propertyId === FILEDATA.createdAt.id) return stampValue(row.createdAt)
  if (propertyId === FILEDATA.modifiedAt.id) return stampValue(row.modifiedAt)
  const picked = row.picked?.[propertyId]
  if (picked) return picked
  const ids = row.contextValues?.[propertyId]
  if (ids !== undefined) return ids.length ? { kind: 'context', value: ids } : NULL_VALUE
  const def = schema.find((d) => d.id === propertyId)
  if (!def) return NULL_VALUE
  let m = resolvedByFm.get(row.frontmatter)
  if (!m) {
    m = new WeakMap()
    resolvedByFm.set(row.frontmatter, m)
  }
  let v = m.get(def)
  if (!v) {
    v = decodeValue(def, (row.frontmatter as Record<string, unknown>)[def.key])
    m.set(def, v)
  }
  return v
}

// MEMOIZED per frontmatter object and definition: the decode was the measured grouped-view hot spot. A value write swaps the frontmatter and a definition edit mints a new definition, so entries self-expire.
const resolvedByFm = new WeakMap<PageFrontmatter, WeakMap<PropertyDefinition, PropertyValue>>()
