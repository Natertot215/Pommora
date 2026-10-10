// One home for what a click or a value menu means on every surface: a checkbox is true-or-absent on disk, never a stored false; the option kinds open their picker; a Date opens the calendar; a valid address opens, and a stamp opens nothing. Each surface only maps the intent to its own widget.

import type { PropertyValue } from '../propertyValue'
import type { ColumnLook } from '../columnStyles'
import type { CellMenuAction } from '../../Actions/cellMenu'
import { readLinkText, urlClickTarget } from '../../Connections/linkValue'
import { type NumberConfig, type PropertyType, specOf } from '../properties'
import { barDivisor } from '../formatValue'

export type ValueIntent =
  | { kind: 'commit'; value: PropertyValue | null }
  | { kind: 'picker' }
  | { kind: 'dateTime' }
  | { kind: 'file' }
  | { kind: 'edit' }
  | { kind: 'popover' }
  | { kind: 'rename' }
  | { kind: 'open'; url: string }
  | { kind: 'hide' }

/** Null = the click does nothing: a stamp, the title, or a page link, whose own text opens it. */
export function valueClickIntent(
  type: PropertyType | 'title' | undefined,
  value: PropertyValue,
  look?: ColumnLook,
  config?: NumberConfig,
): ValueIntent | null {
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
      return barDivisor(look, config) === undefined ? { kind: 'edit' } : { kind: 'popover' }
    case 'text':
      return { kind: 'edit' }
    case 'link': {
      const raw = value.kind === 'link' ? value.value : ''
      const url = urlClickTarget(raw)
      if (url) return { kind: 'open', url }
      return readLinkText(raw)?.kind === 'page' ? null : { kind: 'edit' }
    }
  }
}

const MENU_INTENTS: Partial<Record<CellMenuAction, ValueIntent>> = {
  editLink: { kind: 'edit' },
  'cell:edit': { kind: 'edit' },
  rename: { kind: 'rename' },
  'cell:clear': { kind: 'commit', value: null },
  'cell:hide': { kind: 'hide' },
}

export const valueMenuIntent = (action: CellMenuAction): ValueIntent | null =>
  MENU_INTENTS[action] ?? null

export type ValueIntentHandlers = {
  [K in ValueIntent['kind']]: ((intent: Extract<ValueIntent, { kind: K }>) => void) | null
}

/** True when a handler ran; a null handler declines its intent. */
export function runValueIntent(intent: ValueIntent | null, on: ValueIntentHandlers): boolean {
  if (!intent) return false
  const handle = on[intent.kind] as ((intent: ValueIntent) => void) | null
  handle?.(intent)
  return handle !== null
}
