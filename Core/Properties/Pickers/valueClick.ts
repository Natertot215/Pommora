// One home for the rules that must never drift across surfaces: a checkbox is true-or-absent on disk, never a stored false; the option kinds open their picker; a Date opens the calendar, and a stamp opens nothing.

import type { PropertyValue } from '@pommora/core/Properties/propertyValue'
import { type PropertyType, specOf } from '../properties'

type ValueClickAction =
  | { kind: 'commit'; value: PropertyValue | null }
  | { kind: 'picker' }
  | { kind: 'dateTime' }
  | { kind: 'file' }
  | null

/** Null = the click isn't covered by the shared rules — the surface's own tail routes it. */
export function sharedValueClickAction(
  type: PropertyType | 'title' | undefined,
  value: PropertyValue,
): ValueClickAction {
  const spec = specOf(type)
  if (spec === undefined || spec.origin === 'stamp') return null
  switch (spec.kind) {
    case 'checkbox': {
      const checked = value.kind === 'checkbox' && value.value
      return { kind: 'commit', value: checked ? null : { kind: 'checkbox', value: true } }
    }
    case 'select':
    case 'multiSelect':
    case 'context':
      return { kind: 'picker' }
    case 'dateTime':
      return { kind: 'dateTime' }
    case 'file':
      return { kind: 'file' }
    case 'number':
    case 'link':
      return null
  }
}
