import { style } from '@vanilla-extract/css'

/** The growth ceiling can't be written in CSS at all, since it depends on where the button sits on screen — the shell measures it into `--menu-max`. */
export const pane = style({
  maxWidth: 'var(--menu-max)',
})
