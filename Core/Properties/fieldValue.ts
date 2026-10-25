// Two axes that must not be confused: declaredType is the column's SCHEMA type, whose record entry sort, filter and grouping classify by; resolveFieldValue is the row's VALUE, decoded definition-first — never inferred from a value's shape, so a Link column always reads as a link.

import type { ResolvedColumn, ViewRow } from '../Views/viewRow'
import type { PageFrontmatter } from '../Nexus/schemas'
import { type ColumnType, FILEDATA_BY_ID, type PropertyDefinition } from './properties'
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

const stampValue = (iso: string | null): PropertyValue =>
  iso === null ? NULL_VALUE : { kind: 'dateTime', value: iso }

/** A value a pending write picked stands in until a read retires it. Title, the stamps, and a Context read the row, not the front matter the memo is keyed on; a Context's ids resolve at walk assembly onto the row's own `contextValues`. */
export function resolveFieldValue(row: ViewRow, column: ResolvedColumn): PropertyValue {
  const picked = row.picked?.[column.id]
  if (picked) return picked
  switch (column.kind) {
    case 'title':
      return { kind: 'text', value: row.title }
    case 'stamp':
      return stampValue(column.type === 'createdTime' ? row.createdAt : row.modifiedAt)
    case 'context': {
      const ids = row.contextValues?.[column.id]
      return ids?.length ? { kind: 'context', value: ids } : NULL_VALUE
    }
    case 'property': {
      const { def } = column
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
  }
}

// MEMOIZED per frontmatter object and definition: the decode was the measured grouped-view hot spot. A value write swaps the frontmatter and a definition edit mints a new definition, so entries self-expire.
const resolvedByFm = new WeakMap<PageFrontmatter, WeakMap<PropertyDefinition, PropertyValue>>()
