// `sort[]` is honored in array order (priority = index), each criterion compared until one breaks the tie, then stable input order.

import type { SortCriterion } from '../views'
import type { ViewRow } from '../viewRow'
import { compareTitles } from '../../Paths/caseFold'
import { optionIds, PROPERTY_TYPES, type PropertyDefinition } from '../../Properties/properties'
import { resolveFieldValue } from '../../Properties/fieldValue'
import { optionLabel, type PropertyValue } from '../../Properties/propertyValue'
import { resolveColumn } from './columns'
import { fileName, linkDisplayText, shownProse } from '../../Connections/linkValue'
import { readDate } from '../../Properties/formatValue'

type SortKey = number | string
type Less = (a: SortKey, b: SortKey) => boolean

interface ResolvedCriterion {
  extract: (row: ViewRow) => SortKey
  less: Less
  ascending: boolean
}

const numericLess: Less = (a, b) => (a as number) < (b as number)
const ciLess: Less = (a, b) => compareTitles(a as string, b as string) < 0

function rank(v: PropertyValue, order: Record<string, number>): number {
  const key = v.kind === 'select' ? v.value : undefined
  return key !== undefined && order[key] !== undefined ? order[key] : Number.MAX_SAFE_INTEGER
}

const numberOf = (v: PropertyValue): number =>
  v.kind === 'number' ? v.value : Number.NEGATIVE_INFINITY

function dateOf(v: PropertyValue): number {
  const t = v.kind === 'dateTime' ? readDate(v.value)?.at.getTime() : undefined
  return t ?? Number.NEGATIVE_INFINITY
}

const boolRank = (v: PropertyValue): number => (v.kind === 'checkbox' && v.value ? 1 : 0)

function sortText(v: PropertyValue, def: PropertyDefinition | undefined): string {
  switch (v.kind) {
    case 'text':
      return shownProse(v.value)
    case 'link':
      return linkDisplayText(v.value)
    case 'multiSelect':
      return v.value.map((id) => optionLabel(def, id)).join(',')
    case 'file':
      // The FILENAMES, not the raw `[[…]]` references — every value would otherwise share the leading bracket and order by whatever follows it.
      return v.value.map(fileName).join(',')
    case 'number':
    case 'checkbox':
    case 'dateTime':
    case 'select':
    case 'context':
    case 'null':
      return ''
  }
}

function buildCriterion(
  c: SortCriterion,
  schema: PropertyDefinition[],
  contextIds: readonly string[],
): ResolvedCriterion | null {
  const ascending = c.direction !== 'descending'
  const column = resolveColumn(c.property_id, schema, contextIds)
  if (!column) return null
  const value = (r: ViewRow): PropertyValue => resolveFieldValue(r, column)
  switch (PROPERTY_TYPES[column.type].kind) {
    case 'select': {
      // A Custom order leads with its saved values and appends the options it predates, so they rank ahead of the no-value rows; it always reads ascending.
      const custom = c.order?.length ? c.order : undefined
      const listed = new Set(custom)
      const tail = (column.def ? optionIds(column.def) : []).filter((v) => !listed.has(v))
      const order = Object.fromEntries([...(custom ?? []), ...tail].map((v, i) => [v, i]))
      return {
        extract: (r) => rank(value(r), order),
        less: numericLess,
        ascending: custom ? true : ascending,
      }
    }
    case 'number':
      return { extract: (r) => numberOf(value(r)), less: numericLess, ascending }
    case 'dateTime':
      return { extract: (r) => dateOf(value(r)), less: numericLess, ascending }
    case 'checkbox':
      return { extract: (r) => boolRank(value(r)), less: numericLess, ascending }
    case 'link':
    case 'text':
    case 'multiSelect':
    case 'file':
      return { extract: (r) => sortText(value(r), column.def), less: ciLess, ascending }
    case 'context':
      return null
  }
}

/** TableView's drag/manual-order gates read this, never the raw array length, so a dead criterion can't retire row reorder. */
export function resolvedSortCount(
  sort: SortCriterion[] | undefined,
  schema: PropertyDefinition[],
  contextIds: readonly string[],
): number {
  return (sort ?? []).filter((c) => buildCriterion(c, schema, contextIds) !== null).length
}

export function makeSorter(
  sort: SortCriterion[] | undefined,
  schema: PropertyDefinition[],
  contextIds: readonly string[],
  manualOrder?: string[],
): ((rows: ViewRow[]) => ViewRow[]) | null {
  const resolved = (sort ?? [])
    .map((c) => buildCriterion(c, schema, contextIds))
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
