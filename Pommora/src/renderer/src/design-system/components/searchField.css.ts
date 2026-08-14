import { style } from '@vanilla-extract/css'

/** Only what every search field agrees on. Size, colour, background and ring belong to the surface the
 *  field sits in, so anything a caller could reasonably differ on is left to the caller's own class. */
export const field = style({
  border: 'none',
  outline: 'none',
})
