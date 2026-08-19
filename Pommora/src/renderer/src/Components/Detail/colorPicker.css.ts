import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '../../design-system/tokens/color.css'
import { mixAt } from '../../design-system/tokens/tint'

const c = colorVars.color

export const grid = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '3px',
  padding: '4px',
})

export const row = style({
  display: 'flex',
  gap: '3px',
})

export const swatch = style({
  width: '18px',
  height: '18px',
  borderRadius: '4px',
  border: 'none',
  padding: 0,
  cursor: 'default',
  background: 'var(--sw)',
  // The hairline keeps a dark cell legible against the pane.
  boxShadow: `inset 0 0 0 1px ${c.separator.border}`,
  outline: 'none',
  outlineOffset: '1px',
})

/** The selected cell rings in its own color at tint-primary. The dark seam under it is load-bearing
 *  at one square: the brightest grey's ring resolves to label-primary, which IS that square's fill,
 *  so without a separator the two merge into a single blob. Inert on the other 63. */
export const swatchSelected = style({
  boxShadow: `0 0 0 1px ${mixAt(c.system.black, 60, 'transparent')}`,
  outline: '2px solid var(--ring)',
})
