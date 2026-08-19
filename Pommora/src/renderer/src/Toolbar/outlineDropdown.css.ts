import { style } from '@vanilla-extract/css'
import { TWISTY_CENTER_X } from '@renderer/design-system/components/menu/menu.css'

/** The pane's growth ceiling, and where its disclosure rail hangs from.
 *
 *  Width: headings are arbitrarily long, so the surface widens with its longest row until this stops
 *  it and the row's own truncation takes over. The bound sits on the surface because the surface is
 *  what sizes to the rows; the value can't be written in CSS at all, since it depends on where the
 *  button sits on screen — the shell measures it into `--menu-dropdown-max`.
 *
 *  Rail: outline rows carry no icon, so the rail is pinned to the twisty's own center — the line runs
 *  straight through the parent chevron, and the disclosed run clears it from there. */
export const pane = style({
  maxWidth: 'var(--menu-dropdown-max)',
  vars: { '--menu-rail-x': `${TWISTY_CENTER_X}px` },
})

/** The dragged heading and its whole section dim while it's carried to its new slot. */
export const rowDragging = style({ opacity: 'var(--state-inactive)' })
