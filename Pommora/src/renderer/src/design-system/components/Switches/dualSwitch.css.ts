import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '../../tokens/color.css'
import { tintAt, TINT_STEPS } from '../../tokens/tint'
import { duration, easing } from '../../tokens/motion'

const c = colorVars.color
const ease = `${duration.fast} ${easing.standard}` // one motion source for the whole switch
const control = 'var(--label-control)' // knob fill + tick glyphs

/**
 * The "Switch" — a pill sliding a liquid-glass knob between a `|` (on) and an `O` (off)
 * tick.*/
export const track = style({
  position: 'relative',
  width: '43px',
  height: '19px',
  borderRadius: '10px',
  border: '1px solid var(--label-secondary)',
  background: c.fill.quinary,
  padding: 0,
  flex: '0 0 auto',
  cursor: 'default',
  transition: `background ${ease}`,
})

export const trackOn = style({ background: tintAt('var(--accent)', TINT_STEPS.primary) })

// The sliding slot — vertically centered so the border never offsets it; it shrink-wraps the
// glass-wrapped fill and slides between off (left) and on (right).
export const knob = style({
  position: 'absolute',
  top: '50%',
  left: '2px',
  display: 'flex', // drops the inline-block baseline descender so translateY centers the glass exactly
  transform: 'translateY(-50%)',
  transition: `transform ${ease}`,
  selectors: { [`${trackOn} &`]: { transform: 'translate(16px, -50%)' } },
})

/** The knob's corner, read by the fill AND by the glass wrapping it — the two are one edge, and
 *  stating it twice is what let a resize move one of them alone. */
export const KNOB_RADIUS = 7

export const knobFill = style({
  display: 'block',
  width: '21px',
  height: '14px',
  borderRadius: `${KNOB_RADIUS}px`,
  background: control,
})

// Both ticks: centered, fade on the same beat as the slide; one shows per state.
const tickBase = style({
  position: 'absolute',
  top: '50%',
  borderRadius: '100px',
  transition: `opacity ${ease}`,
})

export const tickLine = style([
  tickBase,
  {
    left: '10px',
    transform: 'translate(-50%, -50%)',
    width: '2px',
    height: '8px',
    background: control,
    opacity: 0,
    selectors: { [`${trackOn} &`]: { opacity: 1 } },
  },
])

export const tickCircle = style([
  tickBase,
  {
    right: '8px',
    transform: 'translateY(-50%)',
    width: '5px',
    height: '5px',
    border: `1px solid ${control}`,
    opacity: 1,
    selectors: { [`${trackOn} &`]: { opacity: 0 } },
  },
])

export const disabled = style({ opacity: 'var(--state-inactive)' })
