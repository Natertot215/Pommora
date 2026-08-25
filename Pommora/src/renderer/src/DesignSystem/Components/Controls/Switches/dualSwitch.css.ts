import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '../../../Tokens/color.css'
import { tintAt } from '../../../Tokens/tint'
import { duration, easing } from '../../../Animation/motion'

const c = colorVars.color
const ease = `${duration.fast} ${easing.baseEase}` // one motion source for the whole switch
const control = 'var(--label-control)'

// The four the knob's travel is measured from; every other number states itself where it's read.
const TRACK_WIDTH = 43
const TRACK_BORDER = 1
const KNOB_WIDTH = 21
const KNOB_INSET = 2

/** The knob's corner, read by the fill AND by the glass wrapping it — the two are one edge, and
 *  stating it twice is what let a resize move one of them alone. */
export const KNOB_RADIUS = 7

// How far the knob slides: the track's inner width, less the knob and the inset it keeps at each end.
const KNOB_TRAVEL = TRACK_WIDTH - 2 * TRACK_BORDER - KNOB_WIDTH - 2 * KNOB_INSET

/**
 * The "Switch" — a pill sliding a liquid-glass knob between a `|` (on) and an `O` (off)
 * tick.*/
export const track = style({
  position: 'relative',
  width: `${TRACK_WIDTH}px`,
  height: '19px',
  borderRadius: '10px',
  border: `${TRACK_BORDER}px solid var(--label-secondary)`,
  background: c.fill.quinary,
  padding: 0,
  flex: '0 0 auto',
  cursor: 'default',
  transition: `background ${ease}`,
})

export const trackOn = style({ background: tintAt('var(--accent)', 'primary') })

// The sliding slot — vertically centered so the border never offsets it; it shrink-wraps the
// glass-wrapped fill and slides between off (left) and on (right).
export const knob = style({
  position: 'absolute',
  top: '50%',
  left: `${KNOB_INSET}px`,
  display: 'flex', // drops the inline-block baseline descender so translateY centers the glass exactly
  transform: 'translateY(-50%)',
  transition: `transform ${ease}`,
  selectors: { [`${trackOn} &`]: { transform: `translate(${KNOB_TRAVEL}px, -50%)` } },
})

export const knobFill = style({
  display: 'block',
  width: `${KNOB_WIDTH}px`,
  height: '14px',
  borderRadius: `${KNOB_RADIUS}px`,
  background: control,
})

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
