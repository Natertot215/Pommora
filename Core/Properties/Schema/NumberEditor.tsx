import { lookOptions, NUMBER_LOOKS } from '@pommora/core/Properties/columnStyles'
import type { NumberConfig, NumberFamily } from '@pommora/core/Properties/properties'
import { CURRENCY_CODES, DEFAULT_CURRENCY } from '@pommora/core/Properties/properties'
import { numberDivisor } from '../formatValue'
import type { PickerOption } from '@pommora/uix/Pickers/PickerControl'
import { MenuRowView, pickerRow, type MenuRow, type Trailing } from '@pommora/uix/Menus'
import { numberFrom } from '@pommora/uix/Pickers/numberUnit'
import * as s from './number-editor.css'

type NumberLook = (typeof NUMBER_LOOKS)[number]

const FAMILY_OPTIONS: PickerOption<NumberFamily>[] = [
  { value: 'number', label: 'Number' },
  { value: 'percent', label: 'Percent' },
  { value: 'currency', label: 'Currency' },
]
const CURRENCY_OPTIONS: PickerOption<string>[] = CURRENCY_CODES.map((code) => ({
  value: code,
  label: code,
}))
const STYLE_OPTIONS = lookOptions(NUMBER_LOOKS)
const DECIMAL_OPTIONS: PickerOption<string>[] = [
  { value: 'hidden', label: 'Hidden' },
  ...Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })),
]

const decimalsToPicker = (d: NumberConfig['number_decimals']): string =>
  typeof d === 'number' ? String(d) : 'hidden'
const pickerToDecimals = (v: string): 'hidden' | number => (v === 'hidden' ? 'hidden' : Number(v))

const ROW_LOOK = { inert: true, className: s.rowRhythm }

const row = (label: string, trailing: Trailing, reveal?: boolean): MenuRow => ({
  kind: 'item',
  label,
  trailing,
  reveal,
  ...ROW_LOOK,
})

export function NumberEditor({
  config,
  look,
  onSetConfig,
  onSetStyle,
}: {
  config: NumberConfig
  look: NumberLook
  onSetConfig: (patch: Partial<NumberConfig>) => void
  onSetStyle: (look: NumberLook) => void
}): React.JSX.Element {
  const family: NumberFamily = config.number_family ?? 'number'
  const isPercent = family === 'percent'
  const fraction = config.number_fraction ?? false
  // The SAME bar-capable test the cell render and the Style menu use, so all three surfaces agree on when Bar is offered.
  const barCapable = numberDivisor(config) !== undefined

  return (
    <div className={s.section}>
      <MenuRowView
        row={pickerRow(
          undefined,
          'Format',
          family,
          FAMILY_OPTIONS,
          (v) => onSetConfig({ number_family: v }),
          { ...ROW_LOOK, ariaLabel: 'Number format' },
        )}
      />

      <MenuRowView
        row={pickerRow(
          undefined,
          'Currency',
          config.number_currency ?? DEFAULT_CURRENCY,
          CURRENCY_OPTIONS,
          (v) => onSetConfig({ number_currency: v }),
          { ...ROW_LOOK, ariaLabel: 'Currency', reveal: family === 'currency' },
        )}
      />

      <MenuRowView
        row={row(
          'Separators',
          {
            kind: 'switch',
            checked: config.number_separators ?? true,
            onChange: (next) => onSetConfig({ number_separators: next }),
            ariaLabel: 'Separators',
          },
          !isPercent,
        )}
      />

      <MenuRowView
        row={pickerRow(
          undefined,
          'Decimals',
          decimalsToPicker(config.number_decimals),
          DECIMAL_OPTIONS,
          (v) => onSetConfig({ number_decimals: pickerToDecimals(v) }),
          { ...ROW_LOOK, ariaLabel: 'Decimal places' },
        )}
      />

      <MenuRowView
        row={row(
          'Fraction',
          {
            kind: 'switch',
            checked: fraction,
            onChange: (next) => onSetConfig({ number_fraction: next }),
            ariaLabel: 'Fraction',
          },
          !isPercent,
        )}
      />

      <MenuRowView
        row={pickerRow(undefined, 'Value', '', [], () => {}, {
          ...ROW_LOOK,
          ariaLabel: 'Fraction value',
          reveal: !isPercent && fraction,
          typeable: {
            text: String(config.number_denominator ?? ''),
            onCommit: (typed) => {
              const n = numberFrom(typed)
              if (n !== undefined || typed === '') onSetConfig({ number_denominator: n })
            },
          },
        })}
      />

      <MenuRowView
        row={pickerRow(undefined, 'Style', look, STYLE_OPTIONS, onSetStyle, {
          ...ROW_LOOK,
          ariaLabel: 'Number style',
          reveal: barCapable,
        })}
      />
    </div>
  )
}
