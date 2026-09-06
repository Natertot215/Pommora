import { style } from '@vanilla-extract/css'
import { track as switchTrack } from './dual-switch.css'

/** Positioned: the ColorPicker anchors below it. */
export const cluster = style({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
})

export const chip = style({
  border: 'none',
  background: 'none',
  padding: 0,
  cursor: 'default',
  display: 'flex',
})

/** The `--sw` fill, doubled so it outranks the DualSwitch track's own background that the swatch composes below. */
const swatchFill = style({ selectors: { '&&': { background: 'var(--sw)' } } })

/** Composes the switch's real track rather than restating its box, so the two can't drift. */
export const swatch = style([switchTrack, swatchFill])
