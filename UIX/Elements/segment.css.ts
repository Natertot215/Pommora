import { style } from '@vanilla-extract/css'
import { vars } from '../Theme/color.css'

export const segment = style({
  flexShrink: 0,
  alignSelf: 'center',
  width: 'var(--segment-width, 2px)',
  background: vars.color.border.light,
  borderRadius: 'var(--radius-full)',
})

export const inlineSegment = style([
  segment,
  {
    display: 'inline',
    paddingInline: 'calc(var(--segment-width, 2px) / 2)',
    marginInline: '6px',
  },
])
