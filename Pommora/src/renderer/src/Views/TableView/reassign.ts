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
      return { kind: 'checkbox', value: groupKey === 'true' }
    default:
      return null
  }
}
