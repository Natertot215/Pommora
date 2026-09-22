import { globalStyle, style } from '@vanilla-extract/css'

export const root = style({})
// Zero specificity: the rim needs a containing block, and any host's own position outranks this one.
globalStyle(`:where(${root})`, { position: 'relative' })

export const rim = style({
  position: 'absolute',
  inset: 0,
  borderRadius: 'inherit',
  pointerEvents: 'none',
  transition: 'box-shadow var(--duration-base) var(--ease-base)',
})
