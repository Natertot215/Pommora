import { globalStyle, style } from '@vanilla-extract/css'
import { dropdownAnchor } from '@renderer/DesignSystem/Components/dropdownAnchor'
import { stack } from '@renderer/DesignSystem/Tokens/stack'

// ── KNOBS — the toolbar dropdown button geometry (tune here) ──
const BUTTON = {
  padX: '8px', // horizontal padding around the segment (same both states; the label slot carries the gap)
}

/** The button + its anchored dropdown share this relative box, so the pane hangs off the button
 *  (not the trio cluster). Sits left of the trio via the toolbar's inter-cluster gap. Shared by every
 *  toolbar dropdown — Views, Outline, Space — only one of which the selection ever puts on screen. */
export const wrapper = style({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  pointerEvents: 'auto',
  WebkitAppRegion: 'no-drag',
  // Rides the trio's swallow shift so the dropdown keeps its gap to the trio's left. It belongs to the
  // wrapper rather than to the cluster's first child: the three dropdowns appear on different
  // selections, so "first child" names a different component depending on what is open. Outside the
  // toolbar the var is unset and the declaration simply doesn't apply.
  transform: 'translateX(calc(-1 * var(--toolbar-swallow)))',
} as Parameters<typeof style>[0])

/** The dropdown anchor — hangs straight down, centered on the button (the beak points up at its
 *  center via the surface's default centered notch). */
export const anchor = style(dropdownAnchor('center', stack.local.lifted))

/** The right-edge variant — the NavPane hangs off the toolbar's trailing cluster. */
export const anchorRight = style(dropdownAnchor('right', stack.local.lifted))

/** The trigger button — one padding for both states; the segment's own gap is zeroed so the collapsing
 *  label slot (button.css) is the sole icon↔title spacing, and the icon-only state sits flush. */
export const button = style({ paddingInline: BUTTON.padX })
globalStyle(`${button} button`, { gap: 0 })

/** A layout-neutral slot around only the button, so its right-click context menu fires on the button
 *  chrome alone — the open pane is a sibling outside this subtree, so right-clicks there don't reach it. */
export const buttonSlot = style({ display: 'contents' })

/** What every toolbar dropdown wears, as `MenuDropdown` takes it. Spread it and add the slots a
 *  given dropdown actually uses, so what a dropdown does differently is the only thing it states. */
export const chrome = { wrapper, button, anchor }

/** The ViewPane row's push chevron — the row's trailing tone, matching the ViewSettings/SettingsPane
 *  nav chevrons. */
export const chevronButton = style({ color: 'var(--label-secondary)' })
