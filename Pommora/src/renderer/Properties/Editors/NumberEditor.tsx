import { useState } from 'react'
import type { NumberConfig, NumberFamily } from '@shared/properties'
import { CURRENCY_CODES } from '@shared/properties'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { EditableInput } from '@renderer/DesignSystem/Fields'
import { numberDivisor } from '@renderer/Properties/Assignment/formatValue'
import type { PickerOption } from '@renderer/DesignSystem/Elements/PickerControl'
import { Reveal } from '@renderer/DesignSystem/Animation/Reveal'
import { MenuRowView, type MenuRow, type Trailing } from '@renderer/DesignSystem/Menus'
import { pickerValue } from '@renderer/DesignSystem/Elements/PickerControl'
import * as s from './number-editor.css'

export type NumberLook = 'number' | 'bar'

const FAMILY_OPTIONS: PickerOption<NumberFamily>[] = [
  { value: 'number', label: 'Number' },
  { value: 'percent', label: 'Percent' },
  { value: 'currency', label: 'Currency' },
]
const CURRENCY_OPTIONS: PickerOption<string>[] = CURRENCY_CODES.map((code) => ({
  value: code,
  label: code,
}))
const STYLE_OPTIONS: PickerOption<NumberLook>[] = [
  { value: 'number', label: 'Number' },
  { value: 'bar', label: 'Bar' },
]
const DECIMAL_OPTIONS: PickerOption<string>[] = [
  { value: 'hidden', label: 'Hidden' },
  ...Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })),
]

const decimalsToPicker = (d: NumberConfig['number_decimals']): string =>
  typeof d === 'number' ? String(d) : 'hidden'
const pickerToDecimals = (v: string): 'hidden' | number => (v === 'hidden' ? 'hidden' : Number(v))

const row = (label: string, trailing: Trailing): MenuRow => ({
  kind: 'item',
  inert: true,
  label,
  trailing,
  className: s.rowRhythm,
})

function ValueField({
  value,
  onCommit,
}: {
  value: number | undefined
  onCommit: (n: number | undefined) => void
}): React.JSX.Element {
  const [editing, setEditing] = useState(false)
  const chevron = <Icon name="chevrons-up-down" size="control" />
  if (editing) {
    return (
      <span className={s.valueControl}>
        <EditableInput
          value={value !== undefined ? String(value) : ''}
          className={s.valueCaret}
          caretAtEnd
          onCommit={(text) => {
            const t = text.trim()
            const n = Number.parseFloat(t)
            onCommit(t === '' || Number.isNaN(n) ? undefined : n)
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
        {chevron}
      </span>
    )
  }
  return (
    <button type="button" className={s.valueControl} onClick={() => setEditing(true)}>
      <span className={pickerValue}>{value ?? ''}</span>
      {chevron}
    </button>
  )
}

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
  // The SAME bar-capable test the cell render and the Style menu use, so all three surfaces agree on
  // when Bar is offered.
  const barCapable = numberDivisor(config) !== undefined

  return (
    <div className={s.section}>
      <MenuRowView
        row={row('Format', {
          kind: 'picker',
          ariaLabel: 'Number format',
          value: family,
          options: FAMILY_OPTIONS,
          onPick: (v: NumberFamily) => onSetConfig({ number_family: v }),
        })}
      />

      <Reveal open={family === 'currency'} fill>
        <MenuRowView
          row={row('Currency', {
            kind: 'picker',
            ariaLabel: 'Currency',
            value: config.number_currency ?? 'USD',
            options: CURRENCY_OPTIONS,
            onPick: (v) => onSetConfig({ number_currency: v }),
          })}
        />
      </Reveal>

      <Reveal open={!isPercent} fill>
        <MenuRowView
          row={row('Separators', {
            kind: 'switch',
            checked: config.number_separators ?? true,
            onChange: (next) => onSetConfig({ number_separators: next }),
            ariaLabel: 'Separators',
          })}
        />
      </Reveal>

      <MenuRowView
        row={row('Decimals', {
          kind: 'picker',
          ariaLabel: 'Decimal places',
          value: decimalsToPicker(config.number_decimals),
          options: DECIMAL_OPTIONS,
          onPick: (v) => onSetConfig({ number_decimals: pickerToDecimals(v) }),
        })}
      />

      <Reveal open={!isPercent} fill>
        <MenuRowView
          row={row('Fraction', {
            kind: 'switch',
            checked: fraction,
            onChange: (next) => onSetConfig({ number_fraction: next }),
            ariaLabel: 'Fraction',
          })}
        />
      </Reveal>

      <Reveal open={!isPercent && fraction} fill>
        <MenuRowView
          row={row('Value', {
            kind: 'field',
            children: (
              <ValueField
                value={config.number_denominator}
                onCommit={(n) => onSetConfig({ number_denominator: n })}
              />
            ),
          })}
        />
      </Reveal>

      <Reveal open={barCapable} fill>
        <MenuRowView
          row={row('Style', {
            kind: 'picker',
            ariaLabel: 'Number style',
            value: look,
            options: STYLE_OPTIONS,
            onPick: onSetStyle,
          })}
        />
      </Reveal>
    </div>
  )
}
