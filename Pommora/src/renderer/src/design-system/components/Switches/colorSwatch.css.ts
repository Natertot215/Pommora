import { style } from '@vanilla-extract/css'
import { swatchFill } from '@renderer/Components/Detail/colorPicker.css'
import { track as switchTrack } from './dualSwitch.css'

/** The cluster — the clickable chip; the ColorPicker anchors below it. */
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

/** The chosen color, worn as the Switch's own shell — it composes the switch's real track rather
 *  than restating its box, so the two can never drift and the swatch is the track's own size. */
export const swatch = style([switchTrack, swatchFill])
