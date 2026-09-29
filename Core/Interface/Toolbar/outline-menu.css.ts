import { globalStyle, style } from '@vanilla-extract/css'
import { STATE_OPACITY } from '@pommora/uix/Theme/color.css'

/** The growth ceiling can't be written in CSS at all, since it depends on where the button sits on screen — the shell measures it into `--menu-max`. */
export const pane = style({
  maxWidth: 'var(--menu-max)',
})

globalStyle(`${pane} [data-drag-source] + [data-reveal]`, { opacity: STATE_OPACITY.ghost })
