import type { CSSProperties } from 'react'
import * as s from './dual-switch.css'
import { cx } from '../Utilities/cx'
import { checkboxPaint } from '../Theme/ramp'
import { GlassControl } from '../Glass/GlassControl'

/** Figma "Switch". Ticks fade on the same beat as the knob's slide (dual-switch.css.ts). `readOnly` draws the same look as a plain value glyph, toggled by the row around it. */
export function DualSwitch({
  checked,
  onChange,
  disabled = false,
  ariaLabel,
  color,
  readOnly,
}: {
  checked: boolean
  onChange?: (next: boolean) => void
  disabled?: boolean
  ariaLabel?: string
  color?: string
  readOnly?: boolean
}): React.JSX.Element {
  const className = cx(s.track, checked && s.trackOn, disabled && s.disabled)
  const style = checkboxPaint(color) as CSSProperties | undefined
  const parts = (
    <>
      <span className={s.tickLine} aria-hidden />
      <span className={s.tickCircle} aria-hidden />
      <span className={s.knob}>
        <GlassControl knob style={{ borderRadius: s.SWITCH_KNOB_RADIUS }}>
          <span className={s.knobFill} />
        </GlassControl>
      </span>
    </>
  )
  if (readOnly) {
    return (
      <span className={className} style={style} aria-hidden="true">
        {parts}
      </span>
    )
  }
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      className={className}
      style={style}
      onClick={() => onChange?.(!checked)}
    >
      {parts}
    </button>
  )
}
