import { globalStyle, style } from '@vanilla-extract/css'
import { menuAnchor } from '@pommora/uix/Menus/menuAnchor'
import { stack } from '@pommora/uix/Theme/stack'
import { vars } from '@pommora/uix/Theme/color.css'

// ── KNOBS — the toolbar menu button geometry (tune here) ──
const BUTTON = {
  padX: '8px',
}

const wrapper = style({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  pointerEvents: 'auto',
  WebkitAppRegion: 'no-drag',
  // Belongs to the wrapper rather than the cluster's first child: the three menus appear on different selections, so "first child" names a different component depending on what is open.
  transform: 'translateX(calc(-1 * var(--toolbar-slide)))',
} as Parameters<typeof style>[0])

const anchor = style(menuAnchor('center', stack.local.lifted))

/** The segment's own gap is zeroed so the collapsing label slot (button.css) is the sole icon↔title spacing. */
const button = style({ paddingInline: BUTTON.padX })
globalStyle(`${button} button`, { gap: 0 })

/** A layout-neutral slot around only the button, so its context menu fires on the button chrome alone — the open menu is a sibling outside this subtree. */
export const buttonSlot = style({ display: 'contents' })

export const chrome = { wrapper, button, anchor }

export const chevronButton = style({ color: vars.color.label.secondary })

/** The views list's closing row, below every view and outside their reorder: its text and lock read as a view's chevron does, its glyph a step quieter. */
export const archiveRow = style({ color: vars.color.label.secondary })
export const archiveGlyph = style({ color: vars.color.label.tertiary })
export const archiveDivider = style({})
globalStyle(`${archiveDivider} > *`, { background: vars.color.border.light })
