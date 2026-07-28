import * as s from './switch.css'
import { cx } from '../../cx'
import { GlassSegment } from '../../materials'

/** Figma "Switch". Ticks fade on the same beat as the knob's slide (switch.css.ts). */
export function Switch({
  checked,
  onChange,
  disabled = false,
  ariaLabel,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  ariaLabel?: string
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      className={cx(s.track, checked && s.trackOn, disabled && s.disabled)}
      onClick={() => onChange(!checked)}
    >
      <span className={s.tickLine} aria-hidden />
      <span className={s.tickCircle} aria-hidden />
      <span className={s.knob}>
        <GlassSegment style={{ borderRadius: 9 }}>
          <span className={s.knobFill} />
        </GlassSegment>
      </span>
    </button>
  )
}
