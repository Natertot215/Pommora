import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '../../Tokens/color.css'
import { font } from '../../Tokens/typography.css'

export const pathChevron = style({
  flex: 'none',
  alignSelf: 'center',
  fontSize: font.scale.control.size,
  fontWeight: font.weight.bold,
  color: `var(--path-chevron-color, ${colorVars.color.label.tertiary})`,
})

export const pathChevronSecondary = style({
  vars: { '--path-chevron-color': colorVars.color.label.secondary },
})

export const pathChevronSmall = style({ fontSize: font.scale.caption.size })
