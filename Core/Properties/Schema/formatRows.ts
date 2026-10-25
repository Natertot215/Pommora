import { type MenuRow, pickerRow } from '@pommora/uix/Menus'
import type { PickerOption } from '@pommora/uix/Pickers/PickerControl'
import type { IconName } from '@pommora/uix/Symbols'
import { DEFAULT_KEY_FORMAT, type FormatChange, type KeyFormat, keyFormat } from '../keyFormat'
import { type PropertyDefinition, PROPERTY_TYPES } from '../properties'

const FORMAT_OPTIONS: PickerOption<KeyFormat>[] = keyFormat.options.map((value) => ({
  value,
  label: value,
}))

export function formatRows(
  def: PropertyDefinition,
  onPick: (change: FormatChange) => void,
): MenuRow[] {
  const row = (
    glyph: IconName,
    label: string,
    value: KeyFormat | undefined,
    change: (format: KeyFormat) => FormatChange,
  ): MenuRow =>
    pickerRow(
      glyph,
      label,
      value ?? DEFAULT_KEY_FORMAT,
      FORMAT_OPTIONS,
      (v: KeyFormat) => onPick(change(v)),
      { inert: true },
    )
  const label = row('metadata-label', 'Label Format', def.key_format, (key_format) => ({
    key_format,
  }))
  return PROPERTY_TYPES[def.type].options
    ? [
        label,
        row('layout-list', 'Value Format', def.value_format, (value_format) => ({ value_format })),
      ]
    : [label]
}
