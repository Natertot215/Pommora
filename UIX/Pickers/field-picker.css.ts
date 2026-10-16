import { style } from '@vanilla-extract/css'
import { vars } from '../Theme/color.css'
import { font } from '../Theme/typography.css'
import { base, field as kitField } from '../Fields/fields.css'
import { focusRing } from '../Fields/fieldRing'

const c = vars.color

/** Left-anchored so the caret sits at the field's left edge, never centered. */
export const content = style({ alignItems: 'flex-start' })

/** The one chrome a typed value's popover wears: the fill, stroke, and focus ring, the control-size type, and a width that follows the content between its bounds; whatever sits inside owns no chrome of its own. */
export const field = style([
  kitField,
  {
    gap: '6px',
    width: 'auto',
    minWidth: '100px', // KNOB
    maxWidth: '200px', // KNOB
    overflow: 'hidden',
    lineHeight: font.scale.control.line,
    fontSize: font.scale.control.size,
    fontWeight: font.weight.emphasized,
    ...focusRing('within'),
  },
])

/** No chrome — the wrapper owns the fill + stroke; sized to its text, scrolling past the wrapper's bound. */
export const suffixInput = style([
  base,
  {
    fieldSizing: 'content',
    flex: '1 1 auto',
    minWidth: 0,
    minHeight: 0,
    whiteSpace: 'nowrap',
    overflowX: 'auto',
    overflowY: 'hidden',
    scrollbarWidth: 'none',
    vars: { '--scroll-fade': 'var(--fade-light)' },
  },
])

export const leading = style({
  flex: '0 0 auto',
  display: 'inline-flex',
  color: c.label.secondary,
  fontWeight: font.weight.semibold,
})

/** The "/ N" out-of hint — pinned, never scrolling. */
export const trailing = style({
  flex: '0 0 auto',
  whiteSpace: 'nowrap',
  color: c.label.tertiary,
})
