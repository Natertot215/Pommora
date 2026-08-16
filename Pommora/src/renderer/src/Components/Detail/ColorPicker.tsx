import type { RefObject } from 'react'
import { PickerMenu } from '@renderer/design-system/components/PickerMenu/PickerMenu'
import type { ChipColorName } from '@renderer/design-system/tokens/chip.css'
import { cx } from '@renderer/design-system/cx'
import * as s from './colorPicker.css'

const SWATCHES = [
  'red',
  'orange',
  'yellow',
  'green',
  'lightBlue',
  'cyan',
  'blue',
  'purple',
  'lavender',
  'grey',
] as const

/** A larger picker over the same tokens is a Prospect — the swatch list is the only thing that grows. */
export function ColorPicker({
  open,
  selected,
  onPick,
  onDismiss,
  triggerRef,
}: {
  open: boolean
  selected: ChipColorName
  onPick: (color: string | undefined) => void
  onDismiss: () => void
  triggerRef: RefObject<Element | null>
}): React.JSX.Element | null {
  return (
    <PickerMenu
      open={open}
      onDismiss={onDismiss}
      triggerRef={triggerRef}
      direction="down"
    >
      <div className={s.grid}>
        {SWATCHES.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={color}
            className={cx(s.swatch, s.swatchColor[color])}
            onClick={() => onPick(selected === color ? undefined : color)}
          />
        ))}
      </div>
    </PickerMenu>
  )
}
