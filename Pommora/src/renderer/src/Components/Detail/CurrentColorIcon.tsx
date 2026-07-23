import { useRef, useState } from 'react'
import { CHIP_SOLID_COLORS, type ChipSolidColor } from '@shared/types'
import { Icon } from '@renderer/design-system/symbols'
import { vars as colorVars } from '@renderer/design-system/tokens/color.css'
import { chipColorFor } from '@renderer/design-system/tokens/colorMap'
import { ColorPicker } from './ColorPicker'

/** The palette glyph that IS the current color: tinted with the selected chip solid,
 *  Label Secondary when unset. Click mounts the shared ColorPicker (the OptionEditor's
 *  ref+toggle pattern); picking the selected swatch again clears to Default. */
export function CurrentColorIcon({
  color,
  size = 15,
  onPick,
}: {
  /** The current chip-solid key (open string; unset = the neutral Default). */
  color?: string
  size?: number
  onPick: (color: string | undefined) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const resolved = chipColorFor(color)
  const tint = (CHIP_SOLID_COLORS as readonly string[]).includes(resolved)
    ? colorVars.color.solid[resolved as ChipSolidColor]
    : colorVars.color.label.tertiary
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label="Color"
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: tint }}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="palette" size={size} />
      </button>
      <ColorPicker
        open={open}
        selected={resolved}
        onPick={(c) => {
          onPick(c)
          setOpen(false)
        }}
        onDismiss={() => setOpen(false)}
        triggerRef={btnRef}
      />
    </>
  )
}
