import { globalStyle, style } from '@vanilla-extract/css'
import { menuAnchor } from '@renderer/DesignSystem/Menus/menu-anchor'
import { stack } from '@renderer/DesignSystem/Tokens/stack'

// ── KNOBS — the toolbar menu button geometry (tune here) ──
const BUTTON = {
  padX: '8px', // horizontal padding around the segment (same both states; the label slot carries the gap)
}

/** The button + its anchored menu share this relative box, so the menu hangs off the button
 *  (not the trio cluster). Sits left of the trio via the toolbar's inter-cluster gap. Shared by every
 *  toolbar menu — Views, Outline, Space — only one of which the selection ever puts on screen. */
export const wrapper = style({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  pointerEvents: 'auto',
  WebkitAppRegion: 'no-drag',
  // Rides the trio's swallow shift so the menu keeps its gap to the trio's left. It belongs to the
  // wrapper rather than to the cluster's first child: the three menus appear on different
  // selections, so "first child" names a different component depending on what is open. Outside the
  // toolbar the var is unset and the declaration simply doesn't apply.
  transform: 'translateX(calc(-1 * var(--toolbar-swallow)))',
} as Parameters<typeof style>[0])

/** The menu anchor — hangs straight down, centered on the button (the beak points up at its
 *  center via the surface's default centered notch). */
export const anchor = style(menuAnchor('center', stack.local.lifted))

/** The right-edge variant — the NavMenu hangs off the toolbar's trailing cluster. */
export const anchorRight = style(menuAnchor('right', stack.local.lifted))

/** The trigger button — one padding for both states; the segment's own gap is zeroed so the collapsing
 *  label slot (button.css) is the sole icon↔title spacing, and the icon-only state sits flush. */
export const button = style({ paddingInline: BUTTON.padX })
globalStyle(`${button} button`, { gap: 0 })

/** A layout-neutral slot around only the button, so its right-click context menu fires on the button
 *  chrome alone — the open menu is a sibling outside this subtree, so right-clicks there don't reach it. */
export const buttonSlot = style({ display: 'contents' })

/** What every toolbar menu wears, as `MenuDropdown` takes it. Spread it and add the slots a
 *  given menu actually uses, so what a menu does differently is the only thing it states. */
export const chrome = { wrapper, button, anchor }

/** The ViewFrame row's push chevron — the row's trailing tone, matching the LayoutFrame/SettingsFrame
 *  nav chevrons. */
export const chevronButton = style({ color: 'var(--label-secondary)' })
