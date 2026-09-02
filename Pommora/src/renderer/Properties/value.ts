// Two axes that must not be confused: declaredType is the column's snake_case SCHEMA type (plus
// the synthetic 'title'/'context' sentinels), what sort/group/filter switch on; resolveFieldValue
// is the row's camelCase-`.kind` VALUE, decoded definition-first by the declared type — never
// inferred from a value's shape, so a url column always reads url even though both are plain
// strings on disk. Pure: no fs, no React.

import type { ViewRow } from '@shared/types'
import type { PageFrontmatter } from '@shared/schemas'
import {
  type PropertyDefinition,
  type PropertyType,
  RESERVED_PROPERTY_ID,
  STAMP_TYPE,
} from '@shared/properties'
import { decodeValue, type PropertyValue } from '@shared/propertyValue'
import { parseConnectionText } from '@shared/connections'

/** The declared type a column sorts/groups/filters by. Reserved columns map to a PropertyType or
 *  a synthetic sentinel: `_title`→'title', any registry Context id→'context', the stamps→their
 *  STAMP_TYPE. `contextIds` is what classifies a Context column, so a caller that omits it sees
 *  none. */
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

const stampValue = (iso: string | null): PropertyValue =>
  iso === null ? { kind: 'null' } : { kind: 'datetime', value: iso }

/** The row's value for a column, as a PropertyValue. Absent or unreadable ⇒ `{ kind: 'null' }` —
 *  a single bad cell never poisons a view.
 *
 *  A CONTEXT column bypasses the cache below: its ids resolve at walk assembly onto the row's own
 *  `contextValues`, with the optimistic write layer's patched-frontmatter rider winning while a
 *  commit is in flight. */
export function resolveFieldValue(
  row: ViewRow,
  propertyId: string,
  schema: PropertyDefinition[],
): PropertyValue {
  // Title and the stamps read the row, not the frontmatter the memo is keyed on.
  if (propertyId === RESERVED_PROPERTY_ID.title) return { kind: 'select', value: row.title }
  if (propertyId === RESERVED_PROPERTY_ID.createdAt) return stampValue(row.createdAt)
  if (propertyId === RESERVED_PROPERTY_ID.modifiedAt) return stampValue(row.modifiedAt)
  {
    const patched = (row.frontmatter as Record<string, unknown>).contextValues
    const fromPatch =
      patched != null && typeof patched === 'object'
        ? (patched as Record<string, string[] | undefined>)[propertyId]
        : undefined
    const ids = fromPatch ?? row.contextValues?.[propertyId]
    if (ids !== undefined) return ids.length ? { kind: 'context', value: ids } : { kind: 'null' }
  }
  let m = resolvedByFm.get(row.frontmatter)
  if (!m) {
    m = new Map()
    resolvedByFm.set(row.frontmatter, m)
  }
  const def = schema.find((d) => d.id === propertyId)
  // Keyed by the NAME the value is stored under plus the type it decodes as — a rename or a type
  // change must re-resolve, and neither swaps the frontmatter identity the outer map is keyed on.
  const cacheKey = def ? `${def.name}\u0000${def.type}` : propertyId
  let v = m.get(cacheKey)
  if (!v) {
    v = def
      ? decodeValue(def, (row.frontmatter as Record<string, unknown>)[def.name])
      : { kind: 'null' }
    m.set(cacheKey, v)
  }
  return v
}

// MEMOIZED per frontmatter object: the grouped pipeline resolves every row per run and every
// Cell resolves the same value again per render — the decode was the measured
// grouped-view hot spot. A value write swaps the page's frontmatter identity (loadValues / the
// optimistic patch), so entries self-expire; resolved values are shared and treated immutable.
const resolvedByFm = new WeakMap<PageFrontmatter, Map<string, PropertyValue>>()

/** The filename a file reference names — the wikilink's own title, or the raw text where it isn't
 *  one. The one extraction, so the order a column sorts in and the text a cell shows can't
 *  disagree about what a reference is called. */
export const fileName = (reference: string): string =>
  parseConnectionText(reference)?.title ?? reference
