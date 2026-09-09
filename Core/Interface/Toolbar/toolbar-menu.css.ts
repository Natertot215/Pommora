import { globalStyle, style } from '@vanilla-extract/css'
import { menuAnchor } from '@pommora/uix/Menus/menuAnchor'
import { stack } from '@pommora/uix/Theme/stack'

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

export const anchorRight = style(menuAnchor('right', stack.local.lifted))

/** The segment's own gap is zeroed so the collapsing label slot (button.css) is the sole icon↔title spacing. */
const button = style({ paddingInline: BUTTON.padX })
globalStyle(`${button} button`, { gap: 0 })

/** A layout-neutral slot around only the button, so its context menu fires on the button chrome alone — the open menu is a sibling outside this subtree. */
export const buttonSlot = style({ display: 'contents' })

export const chrome = { wrapper, button, anchor }

export const chevronButton = style({ color: 'var(--label-secondary)' })
