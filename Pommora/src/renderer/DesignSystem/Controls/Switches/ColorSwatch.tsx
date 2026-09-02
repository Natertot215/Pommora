import { useRef, useState } from 'react'
import { ColorPicker } from '@renderer/DesignSystem/Pickers/ColorPicker/ColorPicker'
import type { LabelColorName } from '@renderer/DesignSystem/Labels'
import { cellPaint } from '@renderer/DesignSystem/Tokens/ramp'
import { tintAt } from '@renderer/DesignSystem/Tokens/tint'
import type { CellKey } from '@shared/theme'
import * as s from './color-swatch.css'

/**
 * The swatch-and-picker pair: a chip using the resolved color, and the grid it opens. Its open
 * state is its own. Greyscale is offered on request, resolved as a chip rather than painted raw —
 * see the picker.
 */
export function ColorSwatch({
  label,
  selected,
  css,
  greyscale = false,
  onPick,
}: {
  label: string
  selected: LabelColorName
  css: string
  /** Offer the grey row. Withheld by default for the reason the picker documents; a surface that
   *  resolves a cell through the chip recipe rather than painting it raw can take it. */
  greyscale?: boolean
  onPick: (color: string | undefined) => void
}): React.JSX.Element {
  // Painted raw, a grey cell sinks into the pane at its dark end — why that row is withheld from
  // surfaces that paint directly.
  const cell = selected.startsWith('grey-') ? cellPaint(selected as CellKey) : null
  const [open, setOpen] = useState(false)
  const chipRef = useRef<HTMLButtonElement>(null)

  return (
    <span className={s.cluster}>
      <button
        ref={chipRef}
        type="button"
        className={s.chip}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className={s.swatch}
          style={
            {
              '--sw': tintAt(cell?.base ?? css, 'primary'),
              // A grey cell brings its own outline; every other leaves the box's own standing.
              borderColor: cell?.outline,
            } as React.CSSProperties
          }
        />
      </button>
      <ColorPicker
        greyscale={greyscale}
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
