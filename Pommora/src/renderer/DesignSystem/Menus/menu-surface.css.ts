import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '../Tokens/color.css'
import { BEAK_RADIUS } from '../Glass/glass-base'

const c = colorVars.color

export const surface = style({
  color: c.label.primary,
  borderRadius: `${BEAK_RADIUS}px`,
  padding: '6px var(--surface-inset)',
  paddingTop: 'calc(var(--notch-h, 0px) + 6px)',
  overflow: 'hidden',
  minWidth: '225px',
})

export const hostedGutter = style({
  padding: '6px var(--surface-inset)',
  display: 'flex',
  flexDirection: 'column',
})
