import type { RefObject } from 'react'
import { PickerMenu } from '@renderer/design-system/components/PickerMenu/PickerMenu'
import type { ChipColorName } from '@renderer/design-system/tokens/chip.css'
import { cellColor, cellRing } from '@renderer/design-system/tokens/ramp'
import { RAMP_FAMILIES, RAMP_STEPS, type CellKey } from '@shared/theme'
import { cx } from '@renderer/design-system/cx'
import * as s from './colorPicker.css'

/**
 * The 8×8 ramp grid — one row per family, dark → light, every spectrum solid on an exact cell.
 * Clicking the selected cell clears, so there is no separate clear affordance.
 *
 * `greyscale` is withheld by the surfaces that paint the RAW cell color: the row's dark end is the
 * window substrate itself, so a link wearing it would be invisible against the page. A surface that
 * resolves a cell through the chip recipe instead — the darkness offset and the borrowed outline —
 * can take the row, and asks for it. A value already stored there still shows its row either way,
 * because clearing is bound to clicking the ringed cell: hide the row it lives in and the value
 * becomes unclearable.
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
  selected: ChipColorName
  onPick: (color: string | undefined) => void
  onDismiss: () => void
  triggerRef: RefObject<Element | null>
  greyscale?: boolean
}): React.JSX.Element | null {
  const showGrey = greyscale || selected.startsWith('grey-')
  const families = showGrey ? RAMP_FAMILIES : RAMP_FAMILIES.filter((f) => f !== 'grey')
  return (
    <PickerMenu open={open} onDismiss={onDismiss} triggerRef={triggerRef} direction="down">
      <div className={s.grid}>
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
    </PickerMenu>
  )
}
