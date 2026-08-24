import { style } from '@vanilla-extract/css'
import { text, TINT_STEPS, tintAt, vars } from '@renderer/design-system/tokens'
import { fieldRing, focusRing } from '@renderer/design-system/fields/fieldRing'
import { separatorLine } from '@renderer/design-system/components/menu/menu.css'

export const CELL = 34
const GUTTER = 8

/** The pane's SOLE surface class (PickerMenu `bareSurface`) — owns 100% of the gutter. Padding equals
 *  the inter-row gap, so the search sits with the same space above it as below it to the divider. */
export const content = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: GUTTER,
  padding: GUTTER,
  width: 'var(--icon-picker-w, 224px)',
  boxSizing: 'border-box',
})

// The body portal escapes the app's type context, so the ramp is pinned explicitly.
export const search = style([
  text.body.standard,
  {
    width: '100%',
    padding: '6px 8px',
    boxSizing: 'border-box',
    textAlign: 'left',
    color: vars.color.label.primary,
    background: vars.color.fill.quaternary,
    border: 'none',
    borderRadius: 8,
    outline: 'none',
    boxShadow: fieldRing(1), // the argument is the ring-width knob
  },
  focusRing(),
])

export const separator = style([separatorLine, { flex: '0 0 auto' }])

/** Favorites: a rounded, outlined box — a second input field holding the favorite icons. Its
 *  divider-color outline replaces the flanking dividers; `overflow: hidden` clips the inner scroll to
 *  the corners so the border stays crisp under the eclipse mask. */
export const favorites = style({
  width: '100%',
  flex: '0 0 auto',
  boxSizing: 'border-box',
  padding: '2px 4px',
  border: 'var(--border-cell)',
  borderRadius: 8,
  overflow: 'hidden',
})

/** The inner horizontal, drag-reorderable strip — wears the over-scroll classes bare rather than the
 *  OverScroll wrapper, so it never snaps back on hover-off. */
export const favScroll = style({
  display: 'flex',
  gap: 2,
  overflowX: 'auto',
  overflowY: 'hidden',
  scrollbarWidth: 'none',
  vars: { '--over-scroll-fade': '16px' },
})

/** The vertical scroll region — holds the favorites strip AND the full-set grid, so favorites scroll
 *  together with the icons under one eclipse fade. Fixed height reserves the ~6-row viewport; explicit
 *  width so `cols` measures a real box (a bare flex item collapses to its absolute rows' zero width). */
export const grid = style({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  width: '100%',
  height: 'var(--icon-picker-h, 204px)',
  overflowY: 'auto',
  overflowX: 'hidden',
  scrollbarWidth: 'none',
  vars: { '--over-scroll-fade': '20px' },
})

/** The virtualized icon list inside the scroll region — its height is the full virtual extent; rows are
 *  absolutely positioned within it (offset by the virtualizer's scrollMargin past the favorites strip). */
export const list = style({ position: 'relative', width: '100%', flex: '0 0 auto' })

export const row = style({ position: 'absolute', top: 0, left: 0, display: 'flex' })

export const cell = style({
  width: CELL,
  height: CELL,
  flex: '0 0 auto',
  display: 'grid',
  placeItems: 'center',
  border: 'none',
  background: 'transparent',
  borderRadius: 8,
  color: vars.color.label.control,
  fontSize: vars.size.icon.title2, // glyphs render at 1em, so the cell's font-size is the icon size
  cursor: 'pointer',
  selectors: {
    '&:hover': { background: vars.color.state.hover },
  },
})

export const cellSelected = style({
  color: 'var(--accent)',
  background: tintAt('var(--accent)', TINT_STEPS.quaternary),
})
