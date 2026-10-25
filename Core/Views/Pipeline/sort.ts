// `sort[]` is honored in array order (priority = index), each criterion compared until one breaks the tie, then stable input order; a value with no key sorts last in either direction.

import type { SortCriterion } from '../views'
import type { ViewRow } from '../viewRow'
import { compareTitles } from '../../Paths/caseFold'
import type { PropertyDefinition } from '../../Properties/properties'
import { resolveFieldValue } from '../../Properties/fieldValue'
import { resolveColumn } from './columns'
import { viewSpecOf } from '../valueKinds'

type SortKey = string | number | null

interface ResolvedCriterion {
  key: (row: ViewRow) => SortKey
  ascending: boolean
}

/** A kind's keys are all numbers or all strings; strings compare as titles do. */
const compareKeys = (a: string | number, b: string | number): number =>
  typeof a === 'number' ? a - (b as number) : compareTitles(a, b as string)

function buildCriterion(
  c: SortCriterion,
  schema: PropertyDefinition[],
  contextIds: readonly string[],
): ResolvedCriterion | null {
  const column = resolveColumn(c.property_id, schema, contextIds)
  const sortKey = viewSpecOf(column?.type)?.sortKey
  if (!column || !sortKey) return null
  const key = sortKey(column.def, c.order)
  return {
    key: (row) => key(resolveFieldValue(row, column)),
    // A Custom order always reads ascending.
    ascending: c.order?.length ? true : c.direction !== 'descending',
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
      keys: resolved.map((rc) => rc.key(row)),
      manual: manualIndex ? (manualIndex.get(row.id) ?? Number.MAX_SAFE_INTEGER) : 0,
    }))
    decorated.sort((a, b) => {
      for (let i = 0; i < resolved.length; i++) {
        const ka = a.keys[i]
        const kb = b.keys[i]
        if (ka === null || kb === null) {
          if (ka !== kb) return ka === null ? 1 : -1
          continue
        }
        const order = compareKeys(ka, kb)
        if (order !== 0) return resolved[i].ascending ? order : -order
      }
      if (a.manual !== b.manual) return a.manual - b.manual
      return a.offset - b.offset
    })
    return decorated.map((d) => d.row)
  }
}
