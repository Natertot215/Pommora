import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '@pommora/uix/Theme/color.css'
import { text } from '@pommora/uix/Theme/typography.css'

export const compactTitle = style([
  text.control.standard,
  { color: colorVars.color.label.control, whiteSpace: 'nowrap' },
])
