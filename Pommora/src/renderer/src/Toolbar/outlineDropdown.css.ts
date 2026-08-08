import { style } from '@vanilla-extract/css'
import { TITLE_X_TWISTY_ONLY } from '@renderer/design-system/components/menu/menu.css'

/** The pane's growth ceiling, and where its disclosure rail hangs from.
 *
 *  Width: headings are arbitrarily long, so the surface widens with its longest row until this stops
 *  it and the row's own truncation takes over. The bound sits on the surface because the surface is
 *  what sizes to the rows; the value can't be written in CSS at all, since it depends on where the
 *  button sits on screen — the shell measures it into `--menu-dropdown-max`.
 *
 *  Rail: outline rows carry no icon, so their titles start right after the twisty. The rail centres on
 *  that first character rather than sitting at its leading edge — `ch` is the font's own advance
 *  width, so the line stays under the glyph at any type scale. */
export const pane = style({
  maxWidth: 'var(--menu-dropdown-max)',
  vars: { '--menu-rail-x': `calc(${TITLE_X_TWISTY_ONLY}px + 0.5ch)` },
})
