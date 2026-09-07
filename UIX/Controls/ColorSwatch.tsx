import { useRef, useState } from 'react'
import { ColorPicker } from '../Pickers/ColorPicker'
import type { LabelColorName } from '../Labels/label-base.css'
import { cellPaint } from '../Theme/ramp'
import { tintAt } from '../Theme/colors'
import type { CellKey } from '@pommora/uix/Theme/colors'
import * as s from './color-swatch.css'

/** Greyscale is resolved as a chip rather than painted raw. */
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
  greyscale?: boolean
  onPick: (color: string | undefined) => void
}): React.JSX.Element {
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
