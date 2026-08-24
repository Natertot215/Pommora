import { globalStyle, style } from '@vanilla-extract/css'
import { vars as colorVars } from '../../Tokens/color.css'
import { BEAK_RADIUS } from './notchedPane.css'
import { titleText } from './menu.css'

const c = colorVars.color

/**
 * The inside horizontal gutter for the large dropdown surface below. Matches the sidebar's edge
 * padding (Sidebar.css) so menu items and dividers align into the same empty gutter.
 *
 * It governs this surface, not every pane that wears a beak. The picker, the text popup and the icon
 * grid each state a tighter gutter of their own, which is a difference in what those surfaces are for
 * rather than drift: a menu only ever drops, while a picker opens in whichever direction it fits.
 */
export const MENU_GUTTER = '10px'

/** The large-dropdown shell: glass (from NotchedPane) + rounded corners + the shared gutter, floored
 *  at a minimum width so a sparse pane never shrink-wraps narrow. The top gutter clears the beak
 *  band via the shell's published --notch-h. */
export const surface = style({
  borderRadius: `${BEAK_RADIUS}px`,
  padding: `6px ${MENU_GUTTER}`,
  paddingTop: 'calc(var(--notch-h, 0px) + 6px)',
  overflow: 'hidden',
  minWidth: '225px',
})

// Dropdown row titles read at the surface's default tone — load-bearing for the settings panes'
// hierarchy: settingsPane's 0-3-0 scopes assume they're stepping DOWN from it. The sidebar keeps
// its own title tone outside a surface, and the picker-menu OPTION deliberately breaks from it —
// a separate surface, not this global.
globalStyle(`${surface} .${titleText}`, { color: c.label.primary })

/** The menu gutter, for a menu pane hosted in the PICKER shell — a view tile's Settings hangs off a
 *  button inside a scrolling surface, so it needs the picker's portal anchoring while still being a
 *  menu: its flush dividers and trailing crumbs are cut against this gutter, not the picker's tighter
 *  one. Worn with `bareSurface`, so it is the pane's sole gutter. */
export const hostedGutter = style({
  padding: `6px ${MENU_GUTTER}`,
  display: 'flex',
  flexDirection: 'column',
})
