import { useState } from 'react'
import type { NumberConfig, NumberFamily } from '@shared/properties'
import { CURRENCY_CODES } from '@shared/properties'
import { DualSwitch } from '@renderer/DesignSystem/Components/Controls/Switches/DualSwitch'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { EditableInput } from '@renderer/DesignSystem/Components/Fields'
import { numberDivisor } from '@renderer/Detail/Views/PropertyEditing/formatValue'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { PickerControl, type PickerChoice } from '@renderer/DesignSystem/Elements/PickerControl'
import { Reveal } from '@renderer/DesignSystem/Animation/Reveal'
import { configLabel, configRow } from '../../Components/Detail/settingsPane.css'
import { pickerValue } from '@renderer/DesignSystem/Elements/PickerControl'
import * as s from './numberEditor.css'

export type NumberLook = 'number' | 'bar'

const FAMILY_OPTIONS: PickerChoice<NumberFamily>[] = [
  { value: 'number', label: 'Number' },
  { value: 'percent', label: 'Percent' },
  { value: 'currency', label: 'Currency' },
]
const CURRENCY_OPTIONS: PickerChoice<string>[] = CURRENCY_CODES.map((code) => ({
  value: code,
  label: code,
}))
const STYLE_OPTIONS: PickerChoice<NumberLook>[] = [
  { value: 'number', label: 'Number' },
  { value: 'bar', label: 'Bar' },
]
// 'hidden' + 1..10, all as picker strings (PickerControl is <T extends string>).
const DECIMAL_OPTIONS: PickerChoice<string>[] = [
  { value: 'hidden', label: 'Hidden' },
  ...Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })),
]

const decimalsToPicker = (d: NumberConfig['number_decimals']): string =>
  typeof d === 'number' ? String(d) : 'hidden'
const pickerToDecimals = (v: string): 'hidden' | number => (v === 'hidden' ? 'hidden' : Number(v))

function Row({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className={cx(configRow, s.row)}>
      <span className={configLabel}>{label}</span>
      {children}
    </div>
  )
}

/** Its rest-state button deliberately mirrors PickerControl's trigger, so it sits identically
 *  among the other rows. */
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

/** Def-level fields write `onSetConfig` (the batched IPC); the look writes `onSetStyle`
 *  (the active view's column_styles). */
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
      <Row label="Format">
        <PickerControl
          ariaLabel="Number format"
          value={family}
          options={FAMILY_OPTIONS}
          onPick={(v) => onSetConfig({ number_family: v })}
        />
      </Row>

      <Reveal open={family === 'currency'} fill>
        <Row label="Currency">
          <PickerControl
            ariaLabel="Currency"
            value={config.number_currency ?? 'USD'}
            options={CURRENCY_OPTIONS}
            onPick={(v) => onSetConfig({ number_currency: v })}
          />
        </Row>
      </Reveal>

      <Reveal open={!isPercent} fill>
        <Row label="Separators">
          <DualSwitch
            checked={config.number_separators ?? true}
            onChange={(next) => onSetConfig({ number_separators: next })}
            ariaLabel="Separators"
          />
        </Row>
      </Reveal>

      <Row label="Decimals">
        <PickerControl
          ariaLabel="Decimal places"
          value={decimalsToPicker(config.number_decimals)}
          options={DECIMAL_OPTIONS}
          onPick={(v) => onSetConfig({ number_decimals: pickerToDecimals(v) })}
        />
      </Row>

      <Reveal open={!isPercent} fill>
        <Row label="Fraction">
          <DualSwitch
            checked={fraction}
            onChange={(next) => onSetConfig({ number_fraction: next })}
            ariaLabel="Fraction"
          />
        </Row>
      </Reveal>

      <Reveal open={!isPercent && fraction} fill>
        <Row label="Value">
          <ValueField
            value={config.number_denominator}
            onCommit={(n) => onSetConfig({ number_denominator: n })}
          />
        </Row>
      </Reveal>

      <Reveal open={barCapable} fill>
        <Row label="Style">
          <PickerControl
            ariaLabel="Number style"
            value={look}
            options={STYLE_OPTIONS}
            onPick={onSetStyle}
          />
        </Row>
      </Reveal>
    </div>
  )
}
