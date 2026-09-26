import { UNGROUPED } from '@pommora/core/Views/viewRow'
import type { PropertyValue } from '@pommora/core/Properties/propertyValue'
import type { PropertyType } from '@pommora/core/Properties/properties'

/** A date bucket isn't a single date, so date grouping can't be reassigned by drag; the rest here can. */
export const REASSIGNABLE_GROUP_TYPES: ReadonlySet<string> = new Set([
  'status',
  'select',
  'checkbox',
] satisfies PropertyType[])

export function groupKeyToValue(
  groupKey: string,
  type: PropertyType | 'title' | undefined,
): PropertyValue | null {
  if (groupKey === UNGROUPED) return null
  switch (type) {
    case 'status':
    case 'select':
      return { kind: 'select', value: groupKey }
    case 'checkbox':
      return groupKey === 'true' ? { kind: 'checkbox', value: true } : null
    default:
      return null
  }
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
