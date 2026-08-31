// The shared value-click semantics every edit surface (table cell, card value, inspector row)
// routes through BEFORE its surface-specific tail (number/url placement differs by design per
// surface). One home for the rules that must never drift: a checkbox is true-or-absent on disk,
// never a stored false; the option kinds open their picker; datetime opens the calendar.

import type { PropertyValue } from '@shared/propertyValue'

export type ValueClickAction =
  | { kind: 'commit'; value: PropertyValue | null }
  | { kind: 'picker' }
  | { kind: 'datetime' }
  /** The dialog — which label was clicked is a hit-test fact the surface supplies, not something
   *  a pure router can read off the value. `runFilePick` is the effect it names. */
  | { kind: 'file' }
  | null

/** Null = the click isn't covered by the shared rules — the surface's own tail routes it. */
export function sharedValueClickAction(
  type: string | undefined,
  value: PropertyValue,
): ValueClickAction {
  if (type === 'checkbox') {
    const checked = value.kind === 'checkbox' && value.value
    return { kind: 'commit', value: checked ? null : { kind: 'checkbox', value: true } }
  }
  if (type === 'status' || type === 'select' || type === 'multi_select' || type === 'context')
    return { kind: 'picker' }
  if (type === 'datetime') return { kind: 'datetime' }
  if (type === 'file') return { kind: 'file' }
  return null
}
