import { style } from '@vanilla-extract/css'
import { ghostRest } from '../Buttons/button-base.css'
import { accessoryButton } from '../Menus/menu-base.css'

export const button = style([accessoryButton, ghostRest])

export const restGlyph = style({
  display: 'flex',
  selectors: { [`${button}:hover &`]: { display: 'none' } },
})
export const hoverGlyph = style({
  display: 'none',
  selectors: { [`${button}:hover &`]: { display: 'flex' } },
})
