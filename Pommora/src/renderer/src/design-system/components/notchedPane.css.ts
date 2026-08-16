import { style } from '@vanilla-extract/css'
import { shadowStandardVar } from '../tokens/color.css'

/** KNOB — the beaked shell's corner radius. One writer: the clip path and SVG outline take it from
 *  here, and so does the surface whose scrolled body has to round to the same arc. */
export const BEAK_RADIUS = 12

export const pop = style({ position: 'relative', width: 'fit-content' })

// SVG stroke of the same notch path — a rect box-shadow can't follow the beak, so the frame
// carries the pane's shadow as a drop-shadow too.
export const frame = style({
  position: 'absolute',
  inset: 0,
  overflow: 'visible',
  pointerEvents: 'none',
  zIndex: 1,
  filter: `drop-shadow(${shadowStandardVar})`,
})
