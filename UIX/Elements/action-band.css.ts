import { keyframes, style } from '@vanilla-extract/css'
import { vars as colorVars } from '../Theme/color.css'
import { text } from '../Theme/typography.css'

const c = colorVars.color

// KNOBS — a segment's box: SEGMENT_MIN_W floors the width (0 = sized to content), SEGMENT_ICON the leading glyph px.
export const SEGMENT_H = '24px'
const SEGMENT_PAD_X = '12px'
const SEGMENT_MIN_W = '0px'
export const SEGMENT_ICON = 13

// The row gap the delete-slide's negative margin swallows — the two move together.
const SEGMENT_GAP = '6px'

export const segmentRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: SEGMENT_GAP,
})

/** Gap is zero — Button's collapsible `labelSlot` is the sole icon↔title spacing, so collapsed sits pixel-identical to a bare icon segment. */
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
    border: `var(--width-125) solid var(--segment-stroke, ${c.border.light})`,
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

// The negative margin swallows the row gap so siblings close up.
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
  animationDuration: 'var(--duration-menu)',
  animationTimingFunction: 'var(--ease-base)',
})
export const segmentExiting = style({
  overflow: 'hidden',
  pointerEvents: 'none',
  animationName: segmentOut,
  animationDuration: 'var(--duration-menu)',
  animationTimingFunction: 'var(--ease-base)',
})

/** Carries its own lead-in since the segment's gap is zero. */
export const segmentTrail = style({ marginLeft: '6px' })

/** Hidden at rest; the HOST binds its own reveal scope with a globalStyle raising opacity. */
export const settingsBtn = style({
  border: 'none',
  background: 'none',
  padding: '2px',
  borderRadius: '4px',
  display: 'flex',
  color: c.label.tertiary,
  opacity: 0,
  transition:
    'opacity var(--duration-fast) var(--ease-base), background var(--duration-fast) var(--ease-base)',
  ':hover': { background: c.state.hover },
})

/** Held while its menu is open, so it reads as that menu's anchor. */
export const settingsBtnActive = style({
  opacity: 1,
  color: c.label.secondary,
  background: 'var(--state-selected)',
})
