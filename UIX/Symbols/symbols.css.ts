import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '../Theme/color.css'
import { duration, easing } from '../Animations/motion'

export const glyphSwap = style({ display: 'inline-grid', placeItems: 'center' })

export const glyphSwapFace = style({
  gridArea: '1 / 1',
  transition: `opacity ${duration.fast} ${easing.baseEase}`,
  selectors: { '&[data-face="hidden"]': { opacity: 0 } },
})

export const lockOpenFace = style({
  selectors: { '&&': { color: colorVars.color.label.tertiary } },
})
