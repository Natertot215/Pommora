import * as s from './dual-switch.css'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { GlassSegment } from '@renderer/DesignSystem/Glass'

/** Figma "Switch". Ticks fade on the same beat as the knob's slide (dual-switch.css.ts). */
export function DualSwitch({
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
        <GlassSegment style={{ borderRadius: s.KNOB_RADIUS }}>
          <span className={s.knobFill} />
        </GlassSegment>
      </span>
    </button>
  )
}
