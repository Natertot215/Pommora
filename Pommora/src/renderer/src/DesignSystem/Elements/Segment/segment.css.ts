import { style } from '@vanilla-extract/css'

export const segment = style({
  flexShrink: 0,
  alignSelf: 'center',
  width: 'var(--segment-width, 2px)',
  background: 'var(--segment-color, var(--separator-segment))',
  borderRadius: 'var(--radius-full)',
})
