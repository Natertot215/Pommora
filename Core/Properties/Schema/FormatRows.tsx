import { MenuIndex, pickerRow } from '@pommora/uix/Menus'
import type { PickerOption } from '@pommora/uix/Pickers/PickerControl'
import * as s from '@pommora/uix/Menus/frames.css'
import { menuCompact } from '@pommora/uix/Menus/menu-row.css'
import { cx } from '@pommora/uix/Utilities/cx'
import { DEFAULT_KEY_FORMAT, type FormatChange, KEY_FORMATS, type KeyFormat } from '../keyFormat'
import { type PropertyDefinition, PROPERTY_TYPES } from '../properties'

const FORMAT_OPTIONS: PickerOption<KeyFormat>[] = KEY_FORMATS.map((value) => ({
  value,
  label: value,
}))

export function FormatRows({
  def,
  onPick,
}: {
  def: PropertyDefinition
  onPick: (change: FormatChange) => void
}): React.JSX.Element {
  const row = (
    label: string,
    value: KeyFormat | undefined,
    change: (format: KeyFormat) => FormatChange,
  ) =>
    pickerRow(
      undefined,
      label,
      value ?? DEFAULT_KEY_FORMAT,
      FORMAT_OPTIONS,
      (v: KeyFormat) => onPick(change(v)),
      { inert: true },
    )
  return (
    <div className={cx(s.configEditor, menuCompact)}>
      <MenuIndex
        sections={[
          {
            rows: [
              row('Label Format', def.key_format, (key_format) => ({ key_format })),
              ...(PROPERTY_TYPES[def.type].options
                ? [row('Value Format', def.value_format, (value_format) => ({ value_format }))]
                : []),
            ],
          },
        ]}
      />
    </div>
  )
}
