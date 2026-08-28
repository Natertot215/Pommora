import { style } from '@vanilla-extract/css'

/** The pane's growth ceiling. Headings are arbitrarily long, so the surface widens with its longest row
 *  until this stops it and the row's own truncation takes over. The bound sits on the surface because the
 *  surface is what sizes to the rows; the value can't be written in CSS at all, since it depends on where
 *  the button sits on screen — the shell measures it into `--menu-max`. */
export const pane = style({
  maxWidth: 'var(--menu-max)',
})

export { rowDragging } from '@renderer/DesignSystem/Menus/menu-base.css'
