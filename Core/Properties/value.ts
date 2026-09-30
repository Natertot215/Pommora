// Two axes that must not be confused: declaredType is the column's SCHEMA type, whose record entry sort, filter and grouping classify by; resolveFieldValue is the row's VALUE, decoded definition-first — never inferred from a value's shape, so a Link column always reads as a link.

import type { ResolvedColumn, ViewRow } from '../Views/viewRow'
import type { PageFrontmatter } from '../Nexus/schemas'
import {
  type PropertyDefinition,
  type PropertyType,
  RESERVED_PROPERTY_ID,
  STAMP_TYPE,
} from './properties'
import { decodeValue, NULL_VALUE, type PropertyValue } from './propertyValue'
import { parseConnectionText } from '../Connections/connections'

export function declaredType(
  propertyId: string,
  schema: PropertyDefinition[],
  contextIds: readonly string[] = [],
): PropertyType | 'title' | undefined {
  if (propertyId === RESERVED_PROPERTY_ID.title) return 'title'
  const stamp = STAMP_TYPE[propertyId]
  if (stamp) return stamp
  if (contextIds.includes(propertyId)) return 'context'
  return schema.find((d) => d.id === propertyId)?.type
}

/** A Context column classifies by its resolved column kind, so a surface without the registry ids still reads it as one. */
export const columnType = (
  column: ResolvedColumn,
  schema: PropertyDefinition[],
): PropertyType | 'title' | undefined =>
  column.kind === 'context' ? 'context' : declaredType(column.id, schema)

const stampValue = (iso: string | null): PropertyValue =>
  iso === null ? NULL_VALUE : { kind: 'dateTime', value: iso }

/** A CONTEXT column bypasses the cache below: its ids resolve at walk assembly onto the row's own `contextValues`, the optimistic patch winning while a commit is in flight. */
export function resolveFieldValue(
  row: ViewRow,
  propertyId: string,
  schema: PropertyDefinition[],
): PropertyValue {
  // Title and the stamps read the row, not the frontmatter the memo is keyed on.
  if (propertyId === RESERVED_PROPERTY_ID.title) return { kind: 'select', value: row.title }
  if (propertyId === RESERVED_PROPERTY_ID.createdAt) return stampValue(row.createdAt)
  if (propertyId === RESERVED_PROPERTY_ID.modifiedAt) return stampValue(row.modifiedAt)
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
    v = decodeValue(def, (row.frontmatter as Record<string, unknown>)[def.name])
    m.set(def, v)
  }
  return v
}

// MEMOIZED per frontmatter object and definition: the decode was the measured grouped-view hot spot. A value write swaps the frontmatter and a definition edit mints a new definition, so entries self-expire.
const resolvedByFm = new WeakMap<PageFrontmatter, WeakMap<PropertyDefinition, PropertyValue>>()

export const fileName = (reference: string): string =>
  parseConnectionText(reference)?.title ?? reference
