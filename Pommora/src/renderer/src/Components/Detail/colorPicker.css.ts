import { style } from '@vanilla-extract/css'

export const grid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 16px)',
  gap: '4px',
})

export const swatch = style({
  width: '16px',
  height: '16px',
  borderRadius: '3px',
  border: 'none',
  padding: 0,
  cursor: 'default',
  background: 'var(--sw)',
})
