import { style } from '@vanilla-extract/css'
import { text, vars } from '@pommora/uix/Theme'
import { stack } from '@pommora/uix/Theme/stack'
import { SIZE } from '@pommora/uix/Labels/label-base.css'

const c = vars.color

export const DWELL_MS = 3000
export const NEAR_RADIUS = 100

export const host = style({
  position: 'fixed',
  top: `calc(var(--app-inset) + var(--toolbar-h) + var(--app-inset))`,
  right: 'var(--surface-inset)',
  zIndex: stack.top.interrupt,
  display: 'flex',
  flexDirection: 'column',
  gap: SIZE.padX,
  minWidth: 220,
  maxWidth: 420,
  padding: SIZE.roomyPadX,
  borderRadius: SIZE.tagRadius,
  borderStyle: 'solid',
  borderWidth: SIZE.border,
  borderColor: c.fill.primary,
  background: c.fill.tertiary,
  vars: { '--pane-inset': 'var(--surface-inset)' },
})

export const error = style({ borderColor: 'var(--error)' })

export const row = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: SIZE.roomyPadX,
})

export const message = style([text.callout.standard, { color: c.label.primary }])

export const action = style([
  text.footnote.semibold,
  {
    color: 'var(--accent)',
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
])
