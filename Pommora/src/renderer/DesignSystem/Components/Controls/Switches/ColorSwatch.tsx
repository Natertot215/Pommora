import { useRef, useState } from 'react'
import { ColorPicker } from '../../Pickers/ColorPicker/ColorPicker'
import type { LabelColorName } from '../../../Labels'
import { cellPaint } from '../../../Tokens/ramp'
import { tintAt } from '../../../Tokens/tint'
import type { CellKey } from '@shared/theme'
import * as s from './colorSwatch.css'

/**
 * The swatch-and-picker pair: a chip wearing the resolved color, and the grid it opens. Its open
 * state is its own — no surface that shows a color field has ever needed to drive it from outside.
 * Greyscale is offered on request, resolved as a chip rather than painted raw — see the picker.
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
  // Through the chip recipe — painted raw a grey cell sinks into the pane at its dark end, which is
  // exactly why that row is withheld from surfaces that do that.
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
