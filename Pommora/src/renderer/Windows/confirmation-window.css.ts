import { keyframes, style } from '@vanilla-extract/css'
import { duration, easing } from '@renderer/Animation/motion'
import { text, vars } from '@renderer/DesignSystem/Tokens'
import { stack } from '@renderer/DesignSystem/Tokens/stack'

const c = vars.color

export const MIN_W = 320
export const MAX_W = 460
export const MIN_H = 132
export const MAX_H = 260

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

export const panel = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--surface-inset)',
  padding: 'var(--surface-inset)',
  borderRadius: 'var(--app-radius)',
  border: `var(--width-100) solid ${c.border.base}`,
  minWidth: MIN_W,
  maxWidth: MAX_W,
  minHeight: MIN_H,
  maxHeight: MAX_H,
})

export const body = style({
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--app-inset)',
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
})

export const message = style([text.body.emphasized, { color: c.label.primary }])

export const detail = style([text.footnote.standard, { color: c.label.secondary }])

export const actions = style({
  display: 'flex',
  gap: 'var(--app-inset)',
  alignItems: 'center',
  justifyContent: 'space-between',
})
