import { style } from '@vanilla-extract/css'
import { vars } from '../../Tokens/color.css'

export const track = style({
  width: '100%',
  height: '6px',
  borderRadius: 'var(--radius-full)',
  background: vars.color.fill.primary,
  overflow: 'hidden',
})

export const fill = style({
  height: '100%',
  borderRadius: 'var(--radius-full)',
  background: 'var(--accent)',
})
