// The action band — the shared home for toolbar-row affordances any surface can mount, embeds and
// full views alike. ViewSegments is the first family: the view-switcher segments (icon + title,
// hairline-bordered, active lift) with their create/delete slide. A new band affordance belongs
// here beside them, not re-rolled at its surface.

import { keyframes, style } from '@vanilla-extract/css'
import { vars as colorVars } from '../design-system/tokens/color.css'
import { text } from '../design-system/tokens/typography.css'

const c = colorVars.color

// KNOBS — a segment's box: a fixed height with a wider horizontal padding gives the ViewDropdown
// button's slightly-rectangular ratio at the segment's own (smaller) size. SEGMENT_MIN_W floors the
// width (0 = sized to content); SEGMENT_ICON is the leading glyph size (px, consumed by components).
export const SEGMENT_H = '24px'
const SEGMENT_PAD_X = '12px'
const SEGMENT_MIN_W = '0px'
export const SEGMENT_ICON = 13

// The row gap the delete-slide's negative margin swallows — the two move together.
const SEGMENT_GAP = '6px'

/** The segments' host row — surfaces compose their own padding/positioning on top. */
export const segmentRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: SEGMENT_GAP,
})

/** One segment: icon + title, hairline-bordered. The active segment lifts on the selected-state
 *  fill (surfacepm idiom, not outline). Gap is zero — Segmented-Controls' collapsible `labelSlot`
 *  is the sole icon↔title spacing, so the hidden state sits pixel-identical to a bare icon segment. */
export const segment = style([
  text.control.emphasized,
  {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    flexShrink: 0,
    boxSizing: 'border-box',
    height: SEGMENT_H,
    minWidth: SEGMENT_MIN_W,
    paddingInline: SEGMENT_PAD_X,
    borderRadius: '8px',
    background: c.fill.quaternary,
    // A view's own chip color lands on the stroke alone (outline-only for now).
    border: `1.25px solid var(--segment-stroke, ${c.separator.segment})`,
    color: c.label.secondary,
    whiteSpace: 'nowrap',
    cursor: 'default',
    // Enter-committing the in-segment rename drops focus onto the button — no native ring.
    ':focus-visible': { outline: 'none' },
  },
])

export const segmentActive = style({
  background: `linear-gradient(var(--state-selected), var(--state-selected)), ${c.fill.quaternary}`,
  color: c.label.primary,
})

// Create/delete slide: a new segment grows in from the leading edge, a deleted one collapses
// out — max-width + opacity on the dropdown token, the negative margin swallowing the row gap so
// siblings close up. No house horizontal-list primitive exists; this is the family's own.
const segmentIn = keyframes({
  '0%': {
    opacity: 0,
    maxWidth: 0,
    marginRight: `calc(-1 * ${SEGMENT_GAP})`,
    transform: 'translateX(-4px)',
  },
  '100%': { opacity: 1, maxWidth: '240px', transform: 'none' },
})
const segmentOut = keyframes({
  '0%': { opacity: 1, maxWidth: '240px' },
  '100%': {
    opacity: 0,
    maxWidth: 0,
    marginRight: `calc(-1 * ${SEGMENT_GAP})`,
    transform: 'translateX(-4px)',
  },
})
export const segmentEntering = style({
  overflow: 'hidden',
  animationName: segmentIn,
  animationDuration: 'var(--duration-dropdown)',
  animationTimingFunction: 'var(--ease-standard)',
})
export const segmentExiting = style({
  overflow: 'hidden',
  pointerEvents: 'none',
  animationName: segmentOut,
  animationDuration: 'var(--duration-dropdown)',
  animationTimingFunction: 'var(--ease-standard)',
})

/** A trailing glyph after the label slot (the dropdown chevron) — carries its own lead-in since
 *  the segment's gap is zero. */
export const segmentTrail = style({ marginLeft: '5px' })

/** The band's settings affordance — hover chrome (top-right family), same glyph as the toolbar
 *  Settings. Hidden at rest; the HOST binds its own reveal scope (tile hover, row hover) with a
 *  globalStyle raising opacity — the scope is the surface's call, the chrome is shared. */
export const settingsBtn = style({
  border: 'none',
  background: 'none',
  padding: '2px',
  borderRadius: '4px',
  display: 'flex',
  color: c.label.tertiary,
  opacity: 0,
  transition:
    'opacity var(--duration-fast) var(--ease-standard), background var(--duration-fast) var(--ease-standard)',
  ':hover': { background: c.state.hover },
})

/** While its pane is open the button stays shown and pressed — the selected-state fill held as if
 *  hovered, so it reads as the anchor of the open pane even once the pointer leaves the host. */
export const settingsBtnActive = style({
  opacity: 1,
  color: c.label.secondary,
  background: 'var(--state-selected)',
})
