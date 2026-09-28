import { style } from '@vanilla-extract/css'
import { vars } from '../Theme/color.css'

export const segment = style({
  flexShrink: 0,
  alignSelf: 'center',
  width: 'var(--segment-width, 2px)',
  background: vars.color.border.light,
  borderRadius: 'var(--radius-full)',
})

export const segments = style({ display: 'inline' })

export const inlineSegment = style({
  display: 'inline-block',
  height: '1lh',
  verticalAlign: 'top',
  marginInline: '6px',
})
