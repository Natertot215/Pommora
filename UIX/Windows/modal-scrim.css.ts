import { keyframes, style } from '@vanilla-extract/css'
import { duration, easing } from '../Animations/motion'
import { vars } from '../Theme'
import { stack } from '../Theme/stack'

const c = vars.color

const scrimIn = keyframes({ from: { opacity: 0 } })
const scrimOut = keyframes({ to: { opacity: 0 } })

// The scrim rides the panel's own window motion so the two arrive and leave together.
const scrim = `${duration.fast} ${easing.baseEase}`

export const backdrop = style({
  position: 'fixed',
  inset: 0,
  zIndex: stack.top.floating,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: c.state.muted,
  animation: `${scrimIn} ${scrim}`,
})

export const backdropClosing = style({
  animation: `${scrimOut} ${scrim} forwards`,
})
