import { keyframes, style } from '@vanilla-extract/css'
import { vars as colorVars } from '../Theme/color.css'
import { text } from '../Theme/typography.css'
import { duration, easing } from '../Animations/motion'
import { REVEAL_FADE } from '../Interactions/hover-reveal.css'

const c = colorVars.color

// KNOBS — a pill's box: PILL_MIN_W floors the width (0 = sized to content), VIEW_PILL_ICON the leading glyph px.
export const VIEW_PILL_H = '24px'
const PILL_PAD_X = '12px'
const PILL_MIN_W = '0px'
export const VIEW_PILL_ICON = 13

// The row gap the delete-slide's negative margin swallows — the two move together.
const PILL_GAP = '6px'

export const viewStrip = style({
  display: 'flex',
  alignItems: 'center',
  gap: PILL_GAP,
})

/** Gap is zero — Button's collapsible `labelSlot` is the sole icon↔title spacing, so collapsed sits pixel-identical to a bare icon pill. */
export const viewPill = style([
  text.control.emphasized,
  {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    flexShrink: 0,
    boxSizing: 'border-box',
    height: VIEW_PILL_H,
    minWidth: PILL_MIN_W,
    paddingInline: PILL_PAD_X,
    borderRadius: '8px',
    background: c.fill.quaternary,
    // A view's own chip color lands on the stroke alone (outline-only for now).
    border: `var(--width-125) solid var(--view-pill-stroke, ${c.border.light})`,
    color: c.label.secondary,
    whiteSpace: 'nowrap',
    cursor: 'default',
    // Enter-committing the in-pill rename drops focus onto the button — no native ring.
    ':focus-visible': { outline: 'none' },
  },
])

export const viewPillActive = style({
  background: `linear-gradient(${c.state.selected}, ${c.state.selected}), ${c.fill.quaternary}`,
  color: c.label.primary,
})

// The negative margin swallows the row gap so siblings close up.
const pillIn = keyframes({
  '0%': {
    opacity: 0,
    maxWidth: 0,
    marginRight: `calc(-1 * ${PILL_GAP})`,
    transform: 'translateX(-4px)',
  },
  '100%': { opacity: 1, maxWidth: '240px', transform: 'none' },
})
const pillOut = keyframes({
  '0%': { opacity: 1, maxWidth: '240px' },
  '100%': {
    opacity: 0,
    maxWidth: 0,
    marginRight: `calc(-1 * ${PILL_GAP})`,
    transform: 'translateX(-4px)',
  },
})
export const viewPillEntering = style({
  overflow: 'hidden',
  animationName: pillIn,
  animationDuration: duration.menu,
  animationTimingFunction: easing.baseEase,
})
export const viewPillExiting = style({
  overflow: 'hidden',
  pointerEvents: 'none',
  animationName: pillOut,
  animationDuration: duration.menu,
  animationTimingFunction: easing.baseEase,
})

/** The dropdown trigger runs tighter than a pill — its trailing chevron already carries the eye to the edge. */
export const viewPillDrop = style({ paddingInline: `calc(${PILL_PAD_X} / 2)` })
export const viewPillTrail = style({
  marginLeft: '6px',
  selectors: { '&&': { color: c.label.secondary } },
})

export const settingsBtn = style({
  border: 'none',
  background: 'none',
  padding: '2px',
  borderRadius: '4px',
  display: 'flex',
  color: c.label.tertiary,
  transition: `${REVEAL_FADE}, background ${duration.fast} ${easing.baseEase}`,
  ':hover': { background: c.state.hover },
})

/** Held while its menu is open, so it reads as that menu's anchor. */
export const settingsBtnActive = style({
  color: c.label.secondary,
  background: c.state.selected,
})
