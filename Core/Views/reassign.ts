import { UNGROUPED } from '@pommora/core/Views/viewRow'
import type { PropertyValue, ValueKind } from '@pommora/core/Properties/propertyValue'
import { type PropertyType, specOf } from '@pommora/core/Properties/properties'

/** A date bucket isn't a single date, so date grouping can't be reassigned by drag; a kind without a function here never reassigns. */
const FROM_GROUP_KEY: Record<ValueKind, ((key: string) => PropertyValue | null) | null> = {
  select: (key) => ({ kind: 'select', value: key }),
  checkbox: (key) => (key === 'true' ? { kind: 'checkbox', value: true } : null),
  dateTime: null,
  number: null,
  multiSelect: null,
  context: null,
  link: null,
  file: null,
}

const fromGroupKey = (type: PropertyType | 'title' | undefined) => {
  const kind = specOf(type)?.kind
  return kind ? FROM_GROUP_KEY[kind] : null
}

export const reassignable = (type: PropertyType | 'title' | undefined): boolean =>
  fromGroupKey(type) !== null

export function groupKeyToValue(
  groupKey: string,
  type: PropertyType | 'title' | undefined,
): PropertyValue | null {
  return groupKey === UNGROUPED ? null : (fromGroupKey(type)?.(groupKey) ?? null)
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
