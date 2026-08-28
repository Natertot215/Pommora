import { globalStyle, style } from '@vanilla-extract/css'
import { vars as colorVars } from '../Tokens/color.css'
import { BEAK_RADIUS } from './menu-shell.css'
import { titleText } from './menu-base.css'

const c = colorVars.color

/** The large-menu shell: glass (from NotchedShell) + rounded corners + the shared gutter, floored
 *  at a minimum width so a sparse pane never shrink-wraps narrow. The top gutter clears the beak
 *  band via the shell's published --notch-h. */
export const surface = style({
  color: c.label.primary,
  borderRadius: `${BEAK_RADIUS}px`,
  padding: '6px var(--surface-inset)',
  paddingTop: 'calc(var(--notch-h, 0px) + 6px)',
  overflow: 'hidden',
  minWidth: '225px',
})

// Menu row titles read at the surface's default tone — load-bearing for the settings frames'
// hierarchy: the Frame stylesheet's 0-3-0 scopes assume they're stepping DOWN from it. The sidebar keeps
// its own title tone outside a surface, and the picker-menu OPTION deliberately breaks from it —
// a separate surface, not this global.
globalStyle(`${surface} .${titleText}`, { color: c.label.primary })

/** The menu gutter, for a menu pane hosted in the PICKER shell — a view tile's Settings hangs off a
 *  button inside a scrolling surface, so it needs the picker's portal anchoring while still being a
 *  menu: its flush dividers and trailing crumbs are cut against this gutter, not the picker's tighter
 *  one. Worn with `bareSurface`, so it is the pane's sole gutter. */
export const hostedGutter = style({
  padding: '6px var(--surface-inset)',
  display: 'flex',
  flexDirection: 'column',
})
