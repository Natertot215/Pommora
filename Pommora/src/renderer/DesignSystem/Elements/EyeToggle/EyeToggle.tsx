import { Icon } from '../../Symbols'
import { Button } from '../../Buttons'
import { cx } from '../../Util/cx'
import * as s from './eye-toggle.css'

/** The visibility eye — rest shows the current state's glyph, hover previews the toggle: a hidden
 *  subject runs the same pair in reverse. Both glyphs mount; CSS swaps them. */
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
    <Button
      size="button-inline"
      paddingX="0"
      className={cx(s.button, className)}
      aria-label={`${hidden ? 'Show' : 'Hide'} ${name}`}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
    >
      <span className={s.restGlyph}>
        <Icon name={hidden ? 'eye-off' : 'eye'} size={s.EYE_ICON} />
      </span>
      <span className={s.hoverGlyph}>
        <Icon name={hidden ? 'eye' : 'eye-off'} size={s.EYE_ICON} />
      </span>
    </Button>
  )
}
