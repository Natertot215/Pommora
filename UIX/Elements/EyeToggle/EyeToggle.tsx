import { Icon } from '../../Symbols'
import { Button } from '../../Buttons/Button'
import { cx } from '../../Utilities/cx'
import * as s from './eye-toggle.css'

/** Hover previews the toggle. Both glyphs mount; CSS swaps them. */
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
