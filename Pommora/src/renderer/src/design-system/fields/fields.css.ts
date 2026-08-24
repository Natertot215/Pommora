import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '../tokens/color.css'
import { text } from '../tokens/typography.css'
import { fieldRing } from './fieldRing'

const c = colorVars.color

/** The transparent search look — every search field agrees on this much; layout and type stay with
 *  the host. Stated before the boxed chrome so a search composed INTO a box keeps the box's fill. */
export const search = style({
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: c.label.primary,
  selectors: {
    '&::placeholder': { color: c.label.tertiary },
  },
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
  },
])

/** The hairline cell variant — a left-aligned, tighter-padded field that holds its own width in a
 *  flex run and eclipses its overflow rather than growing. Seeds the resting stroke through the house
 *  ring CHANNEL, not a hand-rolled shadow: `field` already paints `inset 0 0 0 1px var(--field-ring)`,
 *  so a variant only sets the color. Overriding boxShadow instead would also stomp the channel for any
 *  ancestor that sets it. Width and cursor stay with the consumer — they are what actually differ. */
export const hairlineField = style([
  field,
  {
    flex: '0 0 auto',
    minWidth: 0,
    padding: '3px 6px',
    border: 'none',
    justifyContent: 'flex-start',
    textAlign: 'left',
    color: c.label.control,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    vars: { '--field-ring': c.separator.border },
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
    selectors: {
      '&::placeholder': { color: c.label.tertiary },
    },
  },
])

// § BARE

/** The in-place caret's own reset. An unstyled <input> wears the UA's box — a white fill, a border
 *  and a focus ring in the system accent — which is chrome around a field that is meant to read as
 *  the text it replaced. Stripped to nothing, it inherits the surface's metrics and leaves the
 *  selection to the native highlight. `font` is stated because an <input> never inherits it. */
export const bare = style({
  border: 'none',
  outline: 'none',
  padding: 0,
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
})

// § CONTENT

export const placeholder = style({ color: c.label.tertiary })

const CONTENT_FADE = '16px' // KNOB — the field content row's fade width

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
