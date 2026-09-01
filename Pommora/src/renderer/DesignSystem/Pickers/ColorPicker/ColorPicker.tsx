import type { RefObject } from 'react'
import { PickerMenu } from '../picker-base'
import type { LabelColorName } from '@renderer/DesignSystem/Labels'
import {
  RAMP_FAMILIES,
  RAMP_STEPS,
  cellColor,
  cellRing,
  type CellKey,
} from '@renderer/DesignSystem/Tokens/ramp'
import { cx } from '@renderer/DesignSystem/Util/cx'
import * as s from './colorPicker.css'

/**
 * The 8×8 ramp grid — one row per family, dark → light, every spectrum solid on an exact cell.
 * Clicking the selected cell clears, so there is no separate clear affordance.
 *
 * `greyscale` is withheld by surfaces that paint the raw cell color: the row's dark end is the
 * window substrate itself, so a link using it would be invisible against the page. A surface that
 * resolves a cell through the chip recipe instead can take the row. A value already stored in the
 * grey row still shows it either way — clearing is bound to clicking the ringed cell, so hiding the
 * row it lives in would make the value unclearable.
 */
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

/** The bare 8×8 grid, for surfaces that seat it inside a larger pane. */
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
