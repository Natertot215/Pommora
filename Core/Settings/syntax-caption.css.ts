import { globalStyle, style } from '@vanilla-extract/css'
import { chevron } from '@pommora/uix/Elements/nav-trail.css'
import { vars as colorVars } from '@pommora/uix/Theme/color.css'

const c = colorVars.color

export const mapping = style({
  display: 'inline-flex',
  alignItems: 'center',
  whiteSpace: 'pre',
})

export const written = style({ color: c.label.control })

globalStyle(`${mapping} ${chevron}`, { color: c.label.secondary })
