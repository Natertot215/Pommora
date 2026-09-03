import { UNGROUPED } from '@shared/types'
import type { PropertyValue } from '@shared/propertyValue'

/** Property types whose group key maps cleanly back to a settable value. A date bucket isn't a
 *  single date, so date/datetime grouping can't be reassigned by drag; the rest here can. */
export const REASSIGNABLE_GROUP_TYPES = new Set<string>(['status', 'select', 'checkbox'])

/** The PropertyValue a row takes when dropped into a destination group. The no-value band
 *  (UNGROUPED) clears the property; a property group's key IS the value — the option value for
 *  status/select, the bucket for checkbox. Caller restricts `type` to REASSIGNABLE_GROUP_TYPES. */
export function groupKeyToValue(groupKey: string, type: string | undefined): PropertyValue | null {
  if (groupKey === UNGROUPED) return null
  switch (type) {
    case 'status':
      return { kind: 'select', value: groupKey }
    case 'select':
      return { kind: 'select', value: groupKey }
    case 'checkbox':
      return groupKey === 'true' ? { kind: 'checkbox', value: true } : null
    default:
      return null
  }
}

/** The value a reorder hands a row, or undefined for a pure reorder — the neighbor rule that keeps a
 *  drop to a run's edge (a seam, or either end of the list) from rewriting anything. */
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
