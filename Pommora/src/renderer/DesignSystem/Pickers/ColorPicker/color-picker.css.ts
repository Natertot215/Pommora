import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '@renderer/DesignSystem/Tokens/color.css'
import { tintAt } from '@renderer/DesignSystem/Tokens/tint'

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
  boxShadow: `inset 0 0 0 var(--width-100) ${c.border.base}`,
  outline: 'none',
  outlineOffset: '1px',
})

/** The selected cell rings in its own color at tint-primary. The dark seam under it is load-bearing
 *  at one square: the brightest grey's ring resolves to label-primary, which IS that square's fill,
 *  so without a separator the two merge into a single blob. */
export const swatchSelected = style({
  boxShadow: `0 0 0 1px ${tintAt(c.system.black, 60)}`,
  outline: 'var(--width-200) solid var(--ring)',
})
