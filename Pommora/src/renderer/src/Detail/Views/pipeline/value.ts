// Field-value extraction for the view pipeline. Two functions, two AXES that must NOT be
// confused:
//   - declaredType: the column's SCHEMA type — a snake_case PropertyType (e.g. 'multi_select',
//     'last_edited_time') plus the synthetic 'title'/'context' sentinels for reserved columns. This
//     is what sort/group/filter switch on to choose type-aware behavior.
//   - resolveFieldValue: the row's VALUE as a PropertyValue, whose `.kind` is camelCase (e.g.
//     'multiSelect', 'lastEditedTime'). The shape-parse is trusted for the unambiguous kinds, but
//     the three plain-string kinds (url/select/datetime — identical on disk) are re-tagged to the
//     column's DECLARED type: a url column always reads url, a select column select. The shape
//     guess only decides when there's no schema (the raw codec). This is the fix for the type-erased
//     format's shape ambiguity — without it a Renamed link (`[alias](url)`) read back as a select pill.
// Pure: no fs, no React.

import type { ViewRow } from '@shared/types'
import type { PageFrontmatter } from '@shared/schemas'
import {
  type PropertyDefinition,
  type PropertyType,
  RESERVED_PROPERTY_ID,
} from '@shared/properties'
import { decodeValue, type PropertyValue } from '@shared/propertyValue'
import { wrapKey } from '@shared/governedKeys'

/** The declared type a column sorts/groups/filters by. Reserved columns map to a PropertyType or
 *  a synthetic sentinel: `_title`→'title', any registry Context id→'context', `_modified_at`→
 *  'last_edited_time' (Swift treats it as a date for both filter and sort). `contextIds` is what
 *  classifies a Context column, so a caller that omits it sees none. */
export function declaredType(
  propertyId: string,
  schema: PropertyDefinition[],
  contextIds: readonly string[] = [],
): PropertyType | 'title' | undefined {
  switch (propertyId) {
    case RESERVED_PROPERTY_ID.title:
      return 'title'
    case RESERVED_PROPERTY_ID.modifiedAt:
      return 'last_edited_time'
    default:
      if (contextIds.includes(propertyId)) return 'context'
      return schema.find((d) => d.id === propertyId)?.type
  }
}


/** The row's value for a column, as a PropertyValue. Reserved columns read intrinsic/frontmatter
 *  fields; a user column decodes against the type its own definition declares, so nothing is ever
 *  inferred from the bytes. The decode is cached (the measured grouped-view hot spot) and keyed on
 *  the definition, so a schema type-change re-resolves rather than serving a stale kind. Absent OR
 *  unreadable ⇒ `{ kind: 'null' }` — a single bad cell never poisons a view.
 *
 *  A CONTEXT column bypasses the cache: its ids resolve at walk assembly onto the row's own
 *  `contextValues` (the tree node's field), with the optimistic write layer's `contextValues`
 *  rider on the patched frontmatter winning while a commit is in flight. */
export function resolveFieldValue(
  row: ViewRow,
  propertyId: string,
  schema: PropertyDefinition[],
): PropertyValue {
  // `_title` bypasses the cache — it reads `row.title`, which a rename changes without touching
  // the frontmatter object the cache is keyed on.
  if (propertyId === RESERVED_PROPERTY_ID.title) return { kind: 'select', value: row.title }
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
    v = computeFieldValue(row.frontmatter, propertyId, def)
    m.set(cacheKey, v)
  }
  return v
}

// MEMOIZED per frontmatter object: the grouped pipeline resolves every row per run and every
// Cell resolves the same value again per render — the decode was the measured
// grouped-view hot spot. A value write swaps the page's frontmatter identity (loadValues / the
// optimistic patch), so entries self-expire; resolved values are shared and treated immutable.
const resolvedByFm = new WeakMap<PageFrontmatter, Map<string, PropertyValue>>()

function computeFieldValue(
  fm: PageFrontmatter,
  propertyId: string,
  def: PropertyDefinition | undefined,
): PropertyValue {
  if (propertyId === RESERVED_PROPERTY_ID.modifiedAt) {
    return typeof fm.modified_at === 'string' && fm.modified_at
      ? { kind: 'datetime', value: fm.modified_at }
      : { kind: 'null' }
  }
  // Definition-first: the definition supplies the key its values are stored under. Never walk the
  // frontmatter's wrapped keys looking for definitions — that inverts the rule and would let any
  // wrapped key claim to be a property. A key naming nothing the registry knows is inert.
  if (!def) return { kind: 'null' }
  return decodeValue(def, (fm as Record<string, unknown>)[wrapKey('property', def.name)])
}

/** The `_modified_at` SORT/FILTER stamp: modified_at, falling back to created_at (Swift
 *  modifiedStamp) so a never-modified page orders by its creation time. Deliberately distinct from
 *  `resolveFieldValue('_modified_at')` (the display value, modified_at only, no fallback). Null
 *  when neither is present. */
export function modifiedStampString(row: ViewRow): string | null {
  const fm = row.frontmatter
  return (
    (typeof fm.modified_at === 'string' && fm.modified_at) ||
    (typeof fm.created_at === 'string' && fm.created_at) ||
    null
  )
}
