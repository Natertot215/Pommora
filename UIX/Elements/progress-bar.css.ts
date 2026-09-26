import { style } from '@vanilla-extract/css'
import { vars } from '../Theme/color.css'

export const track = style({
  width: '100%',
  height: '6px',
  borderRadius: 'var(--radius-full)',
  background: vars.color.fill.primary,
  overflow: 'hidden',
})

export const fill = style({
  height: '100%',
  clipPath: 'inset(0 calc(100% - var(--fill) * 1%) 0 0 round var(--radius-full))',
  borderRadius: 'var(--radius-full)',
  background: 'var(--accent)',
})
