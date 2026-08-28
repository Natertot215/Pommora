import { style } from '@vanilla-extract/css'
import { vars } from '../../../Tokens/color.css'
import { font } from '../../../Tokens/typography.css'
import { base, field } from '../../Fields/fields.css'
import { focusRing } from '../../Fields/fieldRing'

const c = vars.color

/** The field left-anchors in the pane so its caret sits at the left edge, never centered. The gutter
 *  is the shared surface's. */
export const content = style({ alignItems: 'flex-start' })

/** Bar-number value editing: the shared field chrome as a fixed-width one-line box — the value fills the
 *  left and the "/ N" out-of hint pins to the right. Focus lights the accent stroke via :focus-within,
 *  since the bare inner input owns no chrome. */
export const suffixField = style([
  field,
  {
    gap: '6px',
    width: '140px',
    overflow: 'hidden',
    ...focusRing('within'),
  },
])

/** The bare inner value input — no chrome (the wrapper owns the fill + stroke); fills the space left of
 *  the pinned hint and scrolls its own overflow. The fade is the shared over-scroll every unboxed
 *  `EditableInput` wears. */
export const suffixInput = style([
  base,
  {
    flex: '1 1 auto',
    minWidth: 0,
    minHeight: 0,
    whiteSpace: 'nowrap',
    overflowX: 'auto',
    overflowY: 'hidden',
    scrollbarWidth: 'none',
    lineHeight: font.scale.control.line,
    fontSize: font.scale.control.size,
    fontWeight: font.weight.emphasized,
    color: c.label.primary,
    vars: { '--over-scroll-fade': 'var(--fade-light)' },
  },
])

/** The "/ N" out-of hint pinned to the field's right — never scrolling. */
export const trailing = style({
  flex: '0 0 auto',
  whiteSpace: 'nowrap',
  color: c.label.tertiary,
  fontSize: font.scale.control.size,
  fontWeight: font.weight.emphasized,
  lineHeight: font.scale.control.line,
})

/** The rename field — the shared input-field chrome at CalendarPicker's caret metrics (control size;
 *  the native caret scales with the font). `field-sizing` grows it to its text between a floor and a
 *  cap, then it scrolls internally. Focused, an `--accent` stroke fades
 *  in over duration-fast; a consumer may scope `--accent` on the pane to tint it (a link wears its own
 *  color), else it inherits the app accent. */
export const input = style([
  field,
  {
    // Undo `field`'s div-oriented layout so the bare input lays out its own single-line caret (the
    // CalendarPicker model): no flex, no default-height floor, and the caret sized to the control line —
    // not the field's base line-height sized for larger text, which is what left the caret oversized
    // + vertically off.
    display: 'block',
    minHeight: 0,
    lineHeight: font.scale.control.line,
    width: 'auto',
    minWidth: '100px',
    maxWidth: '200px',
    fieldSizing: 'content',
    textAlign: 'left', // caret hard-left in the field — explicit, not the inherited/UA default
    border: 'none',
    outline: 'none',
    fontFamily: 'inherit',
    fontSize: font.scale.control.size,
    fontWeight: font.weight.emphasized,
    color: c.label.primary,
    ...focusRing(),
  },
])
