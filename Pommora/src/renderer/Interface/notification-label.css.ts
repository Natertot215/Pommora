import { keyframes, style } from '@vanilla-extract/css'
import { text, vars } from '@renderer/DesignSystem/Tokens'
import { stack } from '@renderer/DesignSystem/Tokens/stack'

const c = vars.color

export const DWELL_MS = 3000
export const NEAR_RADIUS = 120

const slideIn = keyframes({
  from: { transform: 'translateY(calc(-100% - var(--app-inset)))', opacity: 0 },
  to: { transform: 'translateY(0)', opacity: 1 },
})

const drain = keyframes({ from: { transform: 'scaleX(1)' }, to: { transform: 'scaleX(0)' } })

export const host = style({
  position: 'fixed',
  top: `calc(var(--app-inset) + var(--toolbar-h) + var(--app-inset))`,
  left: '50%',
  zIndex: stack.top.floating,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  minWidth: 220,
  maxWidth: 420,
  borderRadius: 'var(--app-radius)',
  border: `var(--width-100) solid var(--system-grey)`,
  background: c.fill.secondary,
  transform: 'translateX(-50%)',
  animation: `${slideIn} var(--duration-base) var(--ease-base)`,
})

export const error = style({ borderColor: 'var(--error)' })

export const leaving = style({
  animationName: slideIn,
  animationDirection: 'reverse',
  animationFillMode: 'forwards',
})

export const row = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--surface-inset)',
  padding: `var(--app-inset) var(--surface-inset)`,
})

export const message = style([text.body.standard, { color: c.label.primary }])

export const action = style([
  text.callout.semibold,
  {
    color: 'var(--accent)',
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
])

export const track = style({ height: 2, background: c.fill.tertiary })

export const fill = style({
  height: '100%',
  background: 'var(--accent)',
  transformOrigin: 'left center',
  animation: `${drain} ${DWELL_MS}ms linear forwards`,
})

export const paused = style({ animationPlayState: 'paused' })
