import type { RefObject } from 'react'
import { PickerMenu } from '@renderer/design-system/components/PickerMenu/PickerMenu'
import type { ChipColorName } from '@renderer/design-system/tokens/chip.css'
import { ANCHOR_CELLS, cellColor } from '@renderer/design-system/tokens/ramp'
import { cx } from '@renderer/design-system/cx'
import * as s from './colorPicker.css'

const SWATCHES = Object.values(ANCHOR_CELLS)

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
    <PickerMenu open={open} onDismiss={onDismiss} triggerRef={triggerRef} direction="down">
      <div className={s.grid}>
        {SWATCHES.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={color}
            className={cx(s.swatch)}
            style={{ '--sw': cellColor(color) } as React.CSSProperties}
            onClick={() => onPick(selected === color ? undefined : color)}
          />
        ))}
      </div>
    </PickerMenu>
  )
}
