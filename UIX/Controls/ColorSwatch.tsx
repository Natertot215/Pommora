import { cellPaint } from '../Theme/ramp'
import { type CellKey, type ColorName, tintAt } from '../Theme/colors'
import * as s from './color-swatch.css'

/** Greyscale is resolved as a chip rather than painted raw. */
export function ColorSwatch({
  label,
  selected,
  css,
  onPress,
}: {
  label: string
  selected: ColorName
  css: string
  onPress: (chip: HTMLElement) => void
}): React.JSX.Element {
  const cell = selected.startsWith('grey-') ? cellPaint(selected as CellKey) : null

  return (
    <button
      type="button"
      className={s.chip}
      aria-label={label}
      onClick={(e) => onPress(e.currentTarget)}
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
  )
}
