import { factorChoice, PickerControl, stepsWith } from '@pommora/uix/Pickers/PickerControl'
import { coerceScale, SCALE_STEPS } from './personalization'

export function ScalePicker({
  ariaLabel,
  value,
  onPick,
}: {
  ariaLabel: string
  value: number
  onPick: (factor: number) => void
}): React.JSX.Element {
  return (
    <PickerControl
      ariaLabel={ariaLabel}
      solid
      chevronLead
      value={String(value)}
      options={stepsWith(SCALE_STEPS, value).map(factorChoice)}
      onPick={(v) => onPick(Number(v))}
      typeable={{
        text: value.toFixed(2),
        suffix: 'x',
        onCommit: (written) => {
          const typed = Number.parseFloat(written.replace(/x/i, '').trim())
          if (Number.isFinite(typed)) onPick(coerceScale(typed, value))
        },
      }}
    />
  )
}
