import { style } from '@vanilla-extract/css'
import { text, vars } from '@renderer/DesignSystem/Tokens'
import { stack } from '@renderer/DesignSystem/Tokens/stack'
import { SIZE } from '@renderer/DesignSystem/Labels/label-base.css'

const c = vars.color

export const DWELL_MS = 3000
export const NEAR_RADIUS = 100

export const host = style({
  position: 'fixed',
  top: `calc(var(--app-inset) + var(--toolbar-h) + var(--app-inset))`,
  right: 'var(--surface-inset)',
  zIndex: stack.top.floating,
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
  // The app-level `--io` inherits, so the driver is declared here — the inspector's must never
  // reach this label.
  vars: { '--pane-inset': 'var(--surface-inset)', '--io': '0' },
  transition: '--io var(--duration-base) var(--ease-base)',
})

export const shown = style({ vars: { '--io': '1' } })

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
