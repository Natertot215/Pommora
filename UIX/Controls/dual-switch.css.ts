import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '../Theme/color.css'
import { tintAt } from '../Theme/colors'
import { duration, easing } from '../Animations/motion'

const c = colorVars.color
const ease = `${duration.fast} ${easing.baseEase}`
const control = 'var(--label-control)'

const TRACK_WIDTH = 43
const TRACK_BORDER = 1
const KNOB_WIDTH = 21
const KNOB_INSET = 2

/** One edge read by both the fill and the glass around it; stating it twice let a resize move one alone. */
export const KNOB_RADIUS = 7

const KNOB_TRAVEL = TRACK_WIDTH - 2 * TRACK_BORDER - KNOB_WIDTH - 2 * KNOB_INSET

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

// Centered on the track so the border never offsets it.
export const knob = style({
  position: 'absolute',
  top: '50%',
  left: `${KNOB_INSET}px`,
  display: 'flex', // drops the baseline descender so translateY centers exactly
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
    border: `var(--width-100) solid ${control}`,
    opacity: 1,
    selectors: { [`${trackOn} &`]: { opacity: 0 } },
  },
])

export const disabled = style({ opacity: 'var(--state-inactive)' })
