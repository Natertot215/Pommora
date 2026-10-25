import { UNGROUPED } from './viewRow'
import type { PropertyValue } from '../Properties/propertyValue'
import type { ColumnType } from '../Properties/properties'
import { FILTER_OPS } from './filterRules'
import { viewSpecOf } from './valueKinds'

/** A band names one value when an Is rule on its key would seed one, so a drag into it writes that value; a date band names a span, never one date, so date grouping can't be reassigned by drag. */
export const reassignable = (type: ColumnType | undefined): boolean => {
  const spec = viewSpecOf(type)
  return spec?.bucket !== undefined && spec.seed !== undefined
}

export function groupKeyToValue(
  groupKey: string,
  type: ColumnType | undefined,
): PropertyValue | null {
  return groupKey === UNGROUPED ? null : (viewSpecOf(type)?.seed?.(FILTER_OPS.is, groupKey) ?? null)
}

/** The neighbor rule keeps a drop to a run's edge — a seam, or either end of the list — from rewriting anything. */
export function reassignTarget(
  order: string[],
  draggedId: string,
  keyOf: (id: string) => string,
): string | undefined {
  const i = order.indexOf(draggedId)
  if (i <= 0 || i >= order.length - 1) return undefined
  const key = keyOf(order[i - 1])
  if (key !== keyOf(order[i + 1]) || key === keyOf(draggedId)) return undefined
  return key
}
