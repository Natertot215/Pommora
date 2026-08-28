import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '@renderer/DesignSystem/Tokens/color.css'
import { text } from '@renderer/DesignSystem/Tokens/typography.css'

export const compactTitle = style([
  text.control.standard,
  { color: colorVars.color.label.control, whiteSpace: 'nowrap' },
])
