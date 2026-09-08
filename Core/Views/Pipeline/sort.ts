// `sort[]` is honored in array order (priority = index), each criterion compared until one breaks the tie, then stable input order.

import type { SortCriterion } from '@pommora/core/Views/views'
import type { ViewRow } from '@pommora/core/Views/viewRow'
import {
  optionValues,
  type PropertyDefinition,
  RESERVED_PROPERTY_ID,
} from '@pommora/core/Properties/properties'
import { declaredType, fileName, resolveFieldValue } from '../../Properties/value'
import { linkDisplayText } from '@pommora/core/Connections/linkValue'

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

/** Select/status sort by the author's option order, not alphabetically; unknown or absent values rank last. */
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
  return v.kind === 'number' ? v.value : Number.NEGATIVE_INFINITY
}

function dateOf(row: ViewRow, propertyId: string, schema: PropertyDefinition[]): number {
  const v = resolveFieldValue(row, propertyId, schema)
  if (v.kind === 'datetime') {
    const t = Date.parse(v.value)
    if (!Number.isNaN(t)) return t
  }
  return Number.NEGATIVE_INFINITY
}

function boolRank(row: ViewRow, propertyId: string, schema: PropertyDefinition[]): number {
  const v = resolveFieldValue(row, propertyId, schema)
  return v.kind === 'checkbox' && v.value ? 1 : 0
}

function sortText(row: ViewRow, propertyId: string, schema: PropertyDefinition[]): string {
  const v = resolveFieldValue(row, propertyId, schema)
  switch (v.kind) {
    case 'url':
      // Sort by the SHOWN text (alias, else URL) — the same parse boundary Cell renders, so an aliased link never sorts by its raw markdown.
      return linkDisplayText(v.value)
    case 'multiSelect':
      return v.value.join(',')
    case 'file':
      // The FILENAMES, not the raw `[[…]]` references — every value would otherwise share the leading bracket and order by whatever follows it.
      return v.value.map(fileName).join(',')
    default:
      return ''
  }
}

function buildCriterion(c: SortCriterion, schema: PropertyDefinition[]): ResolvedCriterion | null {
  const ascending = c.direction !== 'descending'
  if (c.property_id === RESERVED_PROPERTY_ID.title)
    return { extract: (r) => r.title, less: ciLess, ascending }
  switch (declaredType(c.property_id, schema)) {
    case 'select':
    case 'status': {
      // Options the saved order predates rank after the listed ones — at MAX_SAFE_INTEGER they tie with the no-value rows and interleave, the same appended tail `configuredOrder` gives the group path.
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
      return null
  }
}

/** TableView's drag/manual-order gates read this, never the raw array length, so a dead criterion can't retire row reorder. */
export function resolvedSortCount(
  sort: SortCriterion[] | undefined,
  schema: PropertyDefinition[],
): number {
  return (sort ?? []).filter((c) => buildCriterion(c, schema) !== null).length
}

export function makeSorter(
  sort: SortCriterion[] | undefined,
  schema: PropertyDefinition[],
  manualOrder?: string[],
): ((rows: ViewRow[]) => ViewRow[]) | null {
  const resolved = (sort ?? [])
    .map((c) => buildCriterion(c, schema))
    .filter((rc): rc is ResolvedCriterion => rc !== null)
  // The manual order is the LOWEST-priority tiebreaker: it reorders only rows already equal on every real sort key, and is the sole comparator when a view is grouped but unsorted.
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
      if (a.manual !== b.manual) return a.manual - b.manual
      return a.offset - b.offset
    })
    return decorated.map((d) => d.row)
  }
}

/** An active drag override always wins; the view's stored order applies only when the view is sorted or grouped — on a plain view `manual_order` is not a primary order. */
export function resolveManualOrder(
  sortedOrGrouped: boolean,
  manualOverride: string[] | null,
  stored: string[] | undefined,
): string[] | undefined {
  if (!sortedOrGrouped && !manualOverride) return undefined
  return manualOverride ?? stored
}
