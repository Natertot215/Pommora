import { Icon } from '@renderer/design-system/symbols'
import { cx } from '../../design-system/cx'
import * as s from './settingsPane.css'

/** The visibility eye — rest shows the current state's glyph, hover previews the toggle: a hidden
 *  subject runs the same pair in reverse. Both glyphs mount; CSS swaps them. Shared by the
 *  Visibility pane's rows and the Grouping pane's group rows. */
export function EyeToggle({
  hidden,
  name,
  className,
  onToggle,
}: {
  hidden: boolean
  name: string
  className?: string
  onToggle: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      className={cx(s.eyeButton, className)}
      aria-label={`${hidden ? 'Show' : 'Hide'} ${name}`}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
    >
      <span className={s.eyeRestGlyph}>
        <Icon name={hidden ? 'eye-off' : 'eye'} size={s.ICON.eye} />
      </span>
      <span className={s.eyeHoverGlyph}>
        <Icon name={hidden ? 'eye' : 'eye-off'} size={s.ICON.eye} />
      </span>
    </button>
  )
}
