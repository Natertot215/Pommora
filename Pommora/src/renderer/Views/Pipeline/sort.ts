// Multi-key view sort — decorate-sort, select/status by schema option order, a type-complete
// property branch per PropertyType. `sort[]` is honored in array
// order (priority = index), each criterion compared until one breaks the tie, then stable input
// order. Pure: no fs, no React.

import type { SortCriterion } from '@shared/views'
import type { ViewRow } from '@shared/types'
import { optionValues, type PropertyDefinition, RESERVED_PROPERTY_ID } from '@shared/properties'
import { declaredType, fileName, resolveFieldValue } from '@renderer/Properties/value'
import { linkDisplayText } from '@shared/linkValue'

type SortKey = number | string
type Less = (a: SortKey, b: SortKey) => boolean

interface ResolvedCriterion {
  extract: (row: ViewRow) => SortKey
  less: Less
  ascending: boolean
}

const numericLess: Less = (a, b) => (a as number) < (b as number)
const ciLess: Less = (a, b) =>
  (a as string).localeCompare(b as string, undefined, { sensitivity: 'accent' }) < 0

/** Map each select/status option value to its position so those types sort by the author's option
 *  order, not alphabetically (select options first, then status options flattened across the
 *  groups). Unknown/absent values rank last. */
function optionOrderIndex(def: PropertyDefinition): Record<string, number> {
  const index: Record<string, number> = {}
  def.select_options?.forEach((o, i) => {
    index[o.value] = i
  })
  if (def.status_groups) {
    let i = Object.keys(index).length
    for (const g of def.status_groups) {
      for (const o of g.options) {
        index[o.value] = i
        i += 1
      }
    }
  }
  return index
}

function rank(
  row: ViewRow,
  propertyId: string,
  order: Record<string, number>,
  schema: PropertyDefinition[],
): number {
  const v = resolveFieldValue(row, propertyId, schema)
  const key = v.kind === 'select' ? v.value : undefined
  return key !== undefined && order[key] !== undefined ? order[key] : Number.MAX_SAFE_INTEGER
}

function numberOf(row: ViewRow, propertyId: string, schema: PropertyDefinition[]): number {
  const v = resolveFieldValue(row, propertyId, schema)
  return v.kind === 'number' ? v.value : Number.NEGATIVE_INFINITY // absent sorts first ascending
}

function dateOf(row: ViewRow, propertyId: string, schema: PropertyDefinition[]): number {
  const v = resolveFieldValue(row, propertyId, schema)
  if (v.kind === 'datetime') {
    const t = Date.parse(v.value)
    if (!Number.isNaN(t)) return t
  }
  return Number.NEGATIVE_INFINITY // absent / unparseable sorts first ascending
}

function boolRank(row: ViewRow, propertyId: string, schema: PropertyDefinition[]): number {
  const v = resolveFieldValue(row, propertyId, schema)
  return v.kind === 'checkbox' && v.value ? 1 : 0 // false (0) < true (1); absent = false
}

/** Orderable text for the text-ish types `buildCriterion` routes here (url, multiSelect, file).
 *  select/status sort via `rank()` (schema option order) and never reach this; relation/absent
 *  have no orderable text → "". */
function sortText(row: ViewRow, propertyId: string, schema: PropertyDefinition[]): string {
  const v = resolveFieldValue(row, propertyId, schema)
  switch (v.kind) {
    case 'url':
      // Sort by the SHOWN text (alias, else URL) — the same parse boundary Cell renders, so an aliased
      // link never sorts by its raw `[alias](url)` markdown.
      return linkDisplayText(v.value)
    case 'multiSelect':
      return v.value.join(',')
    case 'file':
      // The FILENAMES, not the raw `[[…]]` references — every value would otherwise share the
      // leading bracket and order by whatever follows it.
      return v.value.map(fileName).join(',')
    default:
      return ''
  }
}

/** Resolve one criterion to an extract+less pair, or null when the property isn't sortable
 *  (unknown id, or a Context column). */
function buildCriterion(c: SortCriterion, schema: PropertyDefinition[]): ResolvedCriterion | null {
  const ascending = c.direction !== 'descending'
  if (c.property_id === RESERVED_PROPERTY_ID.title)
    return { extract: (r) => r.title, less: ciLess, ascending }
  switch (declaredType(c.property_id, schema)) {
    case 'select':
    case 'status': {
      // A Custom criterion ranks by its own order; direction is moot for it. Options the saved order
      // predates rank after the listed ones — left at MAX_SAFE_INTEGER they tie with the no-value
      // rows and interleave, which is the same appended tail `configuredOrder` gives the group path.
      if (c.order?.length) {
        const def = schema.find((d) => d.id === c.property_id)
        const listed = new Set(c.order)
        const tail = def ? optionValues(def).filter((v) => !listed.has(v)) : []
        const order = Object.fromEntries([...c.order, ...tail].map((v, i) => [v, i]))
        return {
          extract: (r) => rank(r, c.property_id, order, schema),
          less: numericLess,
          ascending: true,
        }
      }
      const def = schema.find((d) => d.id === c.property_id)
      const order = def ? optionOrderIndex(def) : {}
      return { extract: (r) => rank(r, c.property_id, order, schema), less: numericLess, ascending }
    }
    case 'number':
      return { extract: (r) => numberOf(r, c.property_id, schema), less: numericLess, ascending }
    case 'datetime':
    case 'created_time':
    case 'last_edited_time':
      return { extract: (r) => dateOf(r, c.property_id, schema), less: numericLess, ascending }
    case 'checkbox':
      return { extract: (r) => boolRank(r, c.property_id, schema), less: numericLess, ascending }
    case 'url':
    case 'multi_select':
    case 'context':
    case 'file':
      return { extract: (r) => sortText(r, c.property_id, schema), less: ciLess, ascending }
    default:
      return null // undefined → not sortable
  }
}

/** The EFFECTIVE criteria count — only what buildCriterion resolves (a deleted property or
 *  Context-column criterion sorts by nothing). TableView's drag/manual-order gates read this, never the raw array
 *  length, so a dead criterion can't retire row reorder. */
export function resolvedSortCount(
  sort: SortCriterion[] | undefined,
  schema: PropertyDefinition[],
): number {
  return (sort ?? []).filter((c) => buildCriterion(c, schema) !== null).length
}

/** Build a stable multi-key group-sorter, or null when no criterion is usable (caller keeps input
 *  order). Decorate-sort: each row's key tuple is extracted ONCE, then criteria are compared in
 *  array order (priority = index); full ties hold input order. */
export function makeSorter(
  sort: SortCriterion[] | undefined,
  schema: PropertyDefinition[],
  manualOrder?: string[],
): ((rows: ViewRow[]) => ViewRow[]) | null {
  const resolved = (sort ?? [])
    .map((c) => buildCriterion(c, schema))
    .filter((rc): rc is ResolvedCriterion => rc !== null)
  // The per-machine manual order (viewOrders) is the LOWEST-priority tiebreaker: it reorders
  // only rows already equal on every real sort key, and is the sole comparator when a view is grouped
  // but unsorted. A row absent from the manual order ranks last (appended after the placed ones).
  const manualIndex = manualOrder?.length
    ? new Map(manualOrder.map((id, i) => [id, i] as const))
    : null
  if (resolved.length === 0 && !manualIndex) return null

  return (rows) => {
    const decorated = rows.map((row, offset) => ({
      offset,
      row,
      keys: resolved.map((rc) => rc.extract(row)),
      manual: manualIndex ? (manualIndex.get(row.id) ?? Number.MAX_SAFE_INTEGER) : 0,
    }))
    decorated.sort((a, b) => {
      for (let i = 0; i < resolved.length; i++) {
        const { less, ascending } = resolved[i]
        const ka = a.keys[i]
        const kb = b.keys[i]
        if (ascending) {
          if (less(ka, kb)) return -1
          if (less(kb, ka)) return 1
        } else {
          if (less(kb, ka)) return -1
          if (less(ka, kb)) return 1
        }
      }
      if (a.manual !== b.manual) return a.manual - b.manual // manual order breaks remaining ties
      return a.offset - b.offset // stable: input order among full ties
    })
    return decorated.map((d) => d.row)
  }
}

/** The per-view manual order fed to the sorter (shared by Table and Cards): an active drag override
 *  always wins; otherwise the persisted per-machine order applies only when the view is sorted or
 *  grouped — on a plain view viewOrders is not a primary order. */
export function resolveManualOrder(
  sortedOrGrouped: boolean,
  manualOverride: string[] | null,
  viewOrder: string[] | undefined,
): string[] | undefined {
  if (!sortedOrGrouped && !manualOverride) return undefined
  return manualOverride ?? viewOrder
}
