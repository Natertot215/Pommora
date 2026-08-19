import { useRef, useState, type RefObject } from 'react'
import { PickerMenu } from '@renderer/design-system/components/PickerMenu/PickerMenu'
import type { ChipColorName } from '@renderer/design-system/tokens/chip.css'
import { cellColor, cellRing } from '@renderer/design-system/tokens/ramp'
import { RAMP_FAMILIES, RAMP_STEPS, type CellKey } from '@shared/theme'
import { cx } from '@renderer/design-system/cx'
import { TINT_STEPS, tintAt } from '@renderer/design-system/tokens/tint'
import * as s from './colorPicker.css'
import * as pane from './settingsPane.css'

/**
 * The 8×8 ramp grid — one row per family, dark → light, every spectrum solid on an exact cell.
 * Clicking the selected cell clears, so there is no separate clear affordance.
 *
 * `greyscale` is withheld by the two surfaces that paint the RAW cell color: the row's dark end is
 * the window substrate itself, so a link or checkbox in it would be invisible against the page. A
 * value already stored there still shows its row, because clearing is bound to clicking the ringed
 * cell — hide the row it lives in and the value becomes unclearable.
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

/**
 * The swatch-and-picker pair: a chip wearing the resolved color, and the grid it opens. Its open
 * state is its own — no surface that shows a color field has ever needed to drive it from outside.
 * Greyscale is withheld for the same reason the picker documents above.
 */
export function ColorSwatchField({
  label,
  selected,
  css,
  onPick,
}: {
  label: string
  selected: ChipColorName
  css: string
  onPick: (color: string | undefined) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const chipRef = useRef<HTMLButtonElement>(null)

  return (
    <span className={pane.colorCluster}>
      <button
        ref={chipRef}
        type="button"
        className={pane.colorChip}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className={pane.colorSwatch}
          style={{ '--sw': tintAt(css, TINT_STEPS.primary) } as React.CSSProperties}
        />
      </button>
      <ColorPicker
        greyscale={false}
        open={open}
        selected={selected}
        onPick={(next) => {
          onPick(next)
          setOpen(false)
        }}
        onDismiss={() => setOpen(false)}
        triggerRef={chipRef}
      />
    </span>
  )
}
