// What a click or a value menu means on every surface: a checkbox toggles, the option kinds and a Date open their picker, and a stamp opens nothing; the value seat runs it. An Add entry shows a value it holds, slides into a picker, or acts as that click.

import { checkboxValue, isBlankValue, type PropertyValue } from '../propertyValue'
import type { ColumnLook } from '../columnStyles'
import type { CellMenuAction } from '../../Actions/cellMenu'
import type { ConnEditAction, LinkAction } from '../../Actions/connectionMenu'
import { type ColumnType, type NumberConfig, PROPERTY_TYPES } from '../properties'
import { barDivisor } from '../formatValue'

export type ValueIntent =
  | { kind: 'commit'; value: PropertyValue | null }
  | { kind: 'picker' }
  | { kind: 'file' }
  | { kind: 'edit'; seat?: ConnEditAction }
  | { kind: 'popover'; seat?: ConnEditAction }
  | { kind: 'hide' }

/** Null = the click does nothing: a stamp or the title. A link's text follows on its own, so a click on the value edits it. */
export function valueClickIntent(
  type: ColumnType,
  value: PropertyValue,
  look?: ColumnLook,
  config?: NumberConfig,
): ValueIntent | null {
  const spec = PROPERTY_TYPES[type]
  if (spec.origin === 'filedata') return null
  switch (spec.kind) {
    case 'checkbox': {
      const checked = value.kind === 'checkbox' && value.value
      return { kind: 'commit', value: checkboxValue(!checked) }
    }
    case 'select':
    case 'multiSelect':
    case 'context':
    case 'dateTime':
      return { kind: 'picker' }
    case 'file':
      return { kind: 'file' }
    case 'number':
      return barDivisor(look, config) === undefined ? { kind: 'edit' } : { kind: 'popover' }
    case 'text':
    case 'link':
      return { kind: 'edit' }
  }
}

type EntryOutcome = 'show' | 'slide' | 'click'

export function entryOutcome(type: ColumnType, value: PropertyValue): EntryOutcome {
  if (!isBlankValue(value)) return 'show'
  return valueClickIntent(type, value)?.kind === 'picker' ? 'slide' : 'click'
}

const MENU_INTENTS: Partial<Record<CellMenuAction | LinkAction, ValueIntent>> = {
  editLink: { kind: 'edit', seat: 'editLink' },
  'cell:edit': { kind: 'edit' },
  rename: { kind: 'popover', seat: 'rename' },
  'cell:clear': { kind: 'commit', value: null },
  'cell:hide': { kind: 'hide' },
}

export const valueMenuIntent = (action: CellMenuAction | LinkAction): ValueIntent | null =>
  MENU_INTENTS[action] ?? null
