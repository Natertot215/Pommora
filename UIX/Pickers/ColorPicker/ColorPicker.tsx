import type { RefObject } from 'react'
import { PickerMenu } from '../picker-base'
import type { LabelColorName } from '../../Labels/label-base.css'
import { RAMP_FAMILIES, RAMP_STEPS, cellColor, cellRing, type CellKey } from '../../Theme/ramp'
import { cx } from '../../Utilities/cx'
import * as s from './color-picker.css'

/** `greyscale` is withheld by surfaces that paint the raw cell color — the grey row's dark end is the window substrate itself — but a value already in that row still shows it, or it would be unclearable. */
export function ColorPicker({
  open,
  selected,
  onPick,
  onDismiss,
  triggerRef,
  greyscale = true,
}: {
  open: boolean
  selected: LabelColorName
  onPick: (color: string | undefined) => void
  onDismiss: () => void
  triggerRef: RefObject<Element | null>
  greyscale?: boolean
}): React.JSX.Element | null {
  return (
    <PickerMenu open={open} onDismiss={onDismiss} triggerRef={triggerRef} direction="down">
      <ColorGrid selected={selected} onPick={onPick} greyscale={greyscale} />
    </PickerMenu>
  )
}

export function ColorGrid({
  selected,
  onPick,
  greyscale = true,
  className,
}: {
  selected: LabelColorName
  onPick: (color: string | undefined) => void
  greyscale?: boolean
  className?: string
}): React.JSX.Element {
  const showGrey = greyscale || selected.startsWith('grey-')
  const families = showGrey ? RAMP_FAMILIES : RAMP_FAMILIES.filter((f) => f !== 'grey')
  return (
    <div className={cx(s.grid, className)}>
      {families.map((family) => (
        <div key={family} className={s.row}>
          {RAMP_STEPS.map((step) => {
            const key = `${family}-${step}` as CellKey
            const isSelected = selected === key
            return (
              <button
                key={key}
                type="button"
                aria-label={key}
                className={cx(s.swatch, isSelected && s.swatchSelected)}
                style={
                  {
                    '--sw': cellColor(key),
                    '--ring': cellRing(key),
                  } as React.CSSProperties
                }
                onClick={() => onPick(isSelected ? undefined : key)}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
