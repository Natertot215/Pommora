import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '../Theme/color.css'
import { text } from '../Theme/typography.css'
import { fieldRing, focusRing } from './fieldRing'

const c = colorVars.color

const placeholderTone = {
  selectors: { '&::placeholder': { color: c.label.tertiary } },
}

/** Stated before the boxed chrome so a search composed INTO a box keeps the box's fill. */
export const search = style({
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: c.label.primary,
  ...placeholderTone,
})

export const field = style([
  text.body.standard,
  {
    display: 'flex',
    alignItems: 'center',
    minHeight: '28px',
    padding: '4px 8px',
    borderRadius: '8px',
    background: c.fill.quaternary,
    color: c.label.primary,
    width: '100%',
    boxSizing: 'border-box',
    boxShadow: fieldRing(),
    ...placeholderTone,
  },
])

/** Its resting stroke is the ring CHANNEL's color, never a second shadow. */
export const borderedField = style([
  field,
  {
    flex: '0 0 auto',
    minWidth: 0,
    padding: '2px 6px',
    border: 'none',
    justifyContent: 'flex-start',
    textAlign: 'left',
    color: c.label.primary,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    vars: { '--field-ring': c.border.base },
  },
])

/** `--field-ring` is color, not focus state — the ring survives the killed outline. */
export const input = style([
  field,
  {
    border: 'none',
    outline: 'none',
    font: 'inherit',
  },
])

/** An <input> takes its line-height from the browser, and the caret is drawn to that. */
export const draftInput = style([
  text.body.standard,
  {
    fieldSizing: 'content',
    flex: '1 1 auto',
    minWidth: 0,
    border: 'none',
    outline: 'none',
    background: 'none',
    padding: 0,
    fontFamily: 'inherit',
    color: 'inherit',
  },
])

const LEAD_GAP = '6px' // KNOB — a leading glyph's stand-off
const TRAIL_GAP = '8px' // KNOB — a trailing action's stand-off

const slot = {
  display: 'inline-flex',
  alignItems: 'center',
  alignSelf: 'center',
  flexShrink: 0,
} as const

export const leading = style({ ...slot, marginRight: LEAD_GAP, color: c.label.secondary })

/** Never closer than the gap, so a content-sized field still separates the two. */
export const trailing = style({
  ...slot,
  marginLeft: 'auto',
  paddingLeft: TRAIL_GAP,
  color: c.label.tertiary,
})

/** Room to give way, so the content's fade eclipses the head rather than widening the row. */
export const editable = style({
  width: 'auto',
  flex: '0 1 auto',
  cursor: 'text',
  ...focusRing('within'),
})

/** Transparent is load-bearing: nativeCaret.ts seats the drawn selection pill BEHIND the text. `font` because an <input> never inherits it. */
export const base = style({
  border: 'none',
  outline: 'none',
  padding: 0,
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  ...placeholderTone,
})

export const placeholder = style({ color: c.label.tertiary })
export const fieldTrail = style({ font: 'inherit' })

const CONTENT_FADE = 'var(--fade-base)' // KNOB — the content row's fade width

export const contentRow = style({
  display: 'flex',
  alignItems: 'center',
  flex: '1 1 auto',
  minWidth: 0,
  vars: { '--over-scroll-fade': CONTENT_FADE },
})

// One grid cell holds input and hidden mirror, so the field shrink-wraps through reflow — never a per-keystroke layout read.
export const autoSizeWrap = style({ display: 'inline-grid' })

export const autoSizeMirror = style({
  gridArea: '1 / 1',
  visibility: 'hidden',
  whiteSpace: 'pre',
  pointerEvents: 'none',
})

export const autoSizeInput = style({ gridArea: '1 / 1', width: '100%', minWidth: 0 })
