import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '@renderer/DesignSystem/Tokens/color.css'
import { text } from '@renderer/DesignSystem/Tokens/typography.css'
import { fieldRing, focusRing } from './fieldRing'

const c = colorVars.color

/** Every field's ghost text reads one tone — the axes spread this so no input states its own. */
const placeholderTone = {
  selectors: { '&::placeholder': { color: c.label.tertiary } },
}

/** The transparent search look — every search field agrees on this much; layout and type stay with
 *  the host. Stated before the boxed chrome so a search composed INTO a box keeps the box's fill. */
export const search = style({
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: c.label.primary,
  ...placeholderTone,
})

// § BOX

/** The rounded input surface. The OutlineTint channel: any ancestor (or the
 *  component's `outline` prop) sets `--field-ring` and the field paints the house inset ring
 *  in that color — unset stays ringless. */
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

/** The bordered cell variant — a left-aligned, tighter-padded field that holds its own width in a
 *  flex run and eclipses its overflow rather than growing. Seeds the resting stroke through the house
 *  ring CHANNEL, not a hand-rolled shadow: `field` already paints `inset 0 0 0 1px var(--field-ring)`,
 *  so a variant only sets the color.*/
export const borderedField = style([
  field,
  {
    flex: '0 0 auto',
    minWidth: 0,
    padding: '2px 6px',
    border: 'none',
    justifyContent: 'flex-start',
    textAlign: 'left',
    color: c.label.control,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    vars: { '--field-ring': c.border.base },
  },
])

/** The bare <input> variant — identical chrome, no native border/outline, no focus ring (no
 *  focus animation, by rule). Focus keeps the SEMANTIC ring (`--field-ring` is color, not focus state)
 *  while still killing the native outline. */
export const input = style([
  field,
  {
    border: 'none',
    outline: 'none',
    font: 'inherit',
  },
])

/** The draft caret a press-to-edit field swaps in — sized by its text, pinned to the rest width by
 *  the field, and stating its own type: an <input> takes its line-height from the browser, and the
 *  caret is drawn to that. */
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

/** A glyph before the content — one lead icon saying what the field holds. */
export const leading = style({ ...slot, marginRight: LEAD_GAP, color: c.label.secondary })

/** An action pinned to the field's trailing edge, never closer than the gap to the content — so a
 *  content-sized field still separates the two, and a wide field doesn't strand it mid-way. */
export const trailing = style({
  ...slot,
  marginLeft: 'auto',
  paddingLeft: TRAIL_GAP,
  color: c.label.tertiary,
})

/** A press-to-edit field — a caret cursor at rest, the ring on focus, and room to give way so the
 *  content's own fade eclipses the head rather than the field pushing its row wider. */
export const editable = style({
  width: 'auto',
  flex: '0 1 auto',
  cursor: 'text',
  ...focusRing('within'),
})

// § BASE

/** The in-place caret's own reset. An unstyled <input> wears the UA's box — a white fill, a border
 *  and a focus ring in the system accent — which is chrome around a field that is meant to read as
 *  the text it replaced. Stripped to nothing, it inherits the surface's metrics and leaves the
 *  selection to the native highlight. `font` is stated because an <input> never inherits it. */
export const base = style({
  border: 'none',
  outline: 'none',
  padding: 0,
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  ...placeholderTone,
})

// § CONTENT

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

// Auto-sizing field: the input overlays a hidden mirror span in ONE grid cell, so the field
// shrink-wraps to its text through CSS reflow — never a per-keystroke layout read. Font + padding
// inherit from the caller's surface (the option chip), so the mirror measures in the same metrics.
export const autoSizeWrap = style({ display: 'inline-grid' })

export const autoSizeMirror = style({
  gridArea: '1 / 1',
  visibility: 'hidden',
  whiteSpace: 'pre',
  pointerEvents: 'none',
})

export const autoSizeInput = style({ gridArea: '1 / 1', width: '100%', minWidth: 0 })
