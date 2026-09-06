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

/** The rounded input surface. Any ancestor (or the component's `outline` prop) sets `--field-ring`
 *  and the field paints the house inset ring in that color; unset stays ringless. */
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

/** The bordered cell variant. Its resting stroke is the ring CHANNEL's color, never a second
 *  shadow — `field` already paints `inset 0 0 0 1px var(--field-ring)`. */
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

/** The bare <input> variant. `--field-ring` is color, not focus state, so killing the native
 *  outline here still leaves the semantic ring painted. */
export const input = style([
  field,
  {
    border: 'none',
    outline: 'none',
    font: 'inherit',
  },
])

/** The draft caret a press-to-edit field swaps in. States its own type: an <input> takes its
 *  line-height from the browser, and the caret is drawn to that. */
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

const LEAD_GAP = '6px' // KNOB — a leading glyph's stand-off from the content
const TRAIL_GAP = '8px' // KNOB — how far a trailing action stands off the content it follows

const slot = {
  display: 'inline-flex',
  alignItems: 'center',
  alignSelf: 'center',
  flexShrink: 0,
} as const

export const leading = style({ ...slot, marginRight: LEAD_GAP, color: c.label.secondary })

/** Pinned to the trailing edge but never closer than the gap: a content-sized field still
 *  separates the two, and a wide one doesn't strand it mid-way. */
export const trailing = style({
  ...slot,
  marginLeft: 'auto',
  paddingLeft: TRAIL_GAP,
  color: c.label.tertiary,
})

/** Room to give way, so the content's own fade eclipses the head rather than the field pushing
 *  its row wider. */
export const editable = style({
  width: 'auto',
  flex: '0 1 auto',
  cursor: 'text',
  ...focusRing('within'),
})

/** The in-place caret's reset — the UA's box is chrome around a field meant to read as the text it
 *  replaced. The transparent background is load-bearing: nativeCaret.ts seats the drawn selection
 *  pill BEHIND the field's text. `font` is stated because an <input> never inherits it. */
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

const CONTENT_FADE = 'var(--fade-base)' // KNOB — the field content row's fade width

/** The opt-in content row — the flex cap `over-scroll-x over-scroll-cap` scrolls inside. */
export const contentRow = style({
  display: 'flex',
  alignItems: 'center',
  flex: '1 1 auto',
  minWidth: 0,
  vars: { '--over-scroll-fade': CONTENT_FADE },
})

// The input overlays a hidden mirror span in ONE grid cell, so the field shrink-wraps to its text
// through CSS reflow — never a per-keystroke layout read.
export const autoSizeWrap = style({ display: 'inline-grid' })

export const autoSizeMirror = style({
  gridArea: '1 / 1',
  visibility: 'hidden',
  whiteSpace: 'pre',
  pointerEvents: 'none',
})

export const autoSizeInput = style({ gridArea: '1 / 1', width: '100%', minWidth: 0 })
