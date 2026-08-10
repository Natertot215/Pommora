import { style } from '@vanilla-extract/css'
import { vars } from '../../tokens/color.css'

/** The unfilled track — a thin rounded bar. */
export const track = style({
  width: '100%',
  height: '6px',
  borderRadius: 'var(--radius-full)',
  background: vars.color.fill.primary,
  overflow: 'hidden',
})

/** The filled portion — the runtime accent, width-driven. */
export const fill = style({
  height: '100%',
  borderRadius: 'var(--radius-full)',
  background: 'var(--accent)',
})
