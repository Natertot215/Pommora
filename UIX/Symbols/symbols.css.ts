import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '../Theme/color.css'

export const lockOpenFace = style({
  selectors: { '&&': { color: colorVars.color.label.tertiary } },
})
