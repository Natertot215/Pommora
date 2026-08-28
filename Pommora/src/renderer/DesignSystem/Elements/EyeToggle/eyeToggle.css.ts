import { style } from '@vanilla-extract/css'
import type { IconSize } from '../../Tokens/size.css'
import { ghostRest } from '../../Buttons/button-base.css'
import { accessoryButton } from '../../Menus/menu-base.css'

/** The ladder step the eye's glyph names. A host drawing an inert twin for visual parity reads this
 *  rather than restating a size. */
export const EYE_ICON: IconSize = 'body'

/** The action-symbol color plus a ghost at rest, un-ghosting on hover with no color shift. */
export const button = style([accessoryButton, ghostRest])

export const restGlyph = style({
  display: 'flex',
  selectors: { [`${button}:hover &`]: { display: 'none' } },
})
export const hoverGlyph = style({
  display: 'none',
  selectors: { [`${button}:hover &`]: { display: 'flex' } },
})
