// The FilterPane's rule rows + field variants. A row is a free flex run — connector · what ·
// operator · value · remove — with NO cross-row column alignment: every field sizes to its own
// row's content, so a short operator gets a short field regardless of what any other row holds.
// Sizing priority within a row: the operator hugs its label and is never granted spare width, the
// value absorbs what's left and yields first, and the pane fills its host before stretching with
// content toward the max-width knob. Fields wear control typography, and the remove × sits in flow
// at the row's trailing edge so it can never overlap the value.
import { globalStyle, style } from '@vanilla-extract/css'
import { vars as colorVars } from '../../design-system/tokens/color.css'
import { duration, easing } from '../../design-system/tokens/motion'
import { TINT_STEPS, tintAt } from '../../design-system/tokens/tint'
import { text } from '../../design-system/tokens/typography.css'
import { field as fieldBase } from '../../design-system/components/interactionField.css'

const c = colorVars.color

/** KNOB — the pane's content-driven width ceiling. */
const FILTER_MAX_WIDTH = '420px'

/** KNOB — the pane's height floor (matches the hosts' leaf slider floor) so the "+" footer pins
 *  to the bottom edge like every other pane's footing. */
const FILTER_MIN_HEIGHT = '245px'

/** KNOB — the clear-×'s breathing room off the row's trailing edge. */
const REMOVE_INSET = '2px'

/** KNOB — the checkbox box steps down to the pane's control scale; the shared chipBox is a fixed
 *  17px sized for table cells, which reads oversized beside 12px type and a 12px chevron. */
export const checkBoxScale = style({ zoom: 0.76 })

export const pane = style({
  // Fill the host leaf first — its floor is the real minimum — then stretch with the longest row up
  // to the ceiling. Without the `100%` floor a bare `max-content` collapses the pane to its widest
  // row (~112px on an empty filter) INSIDE a 225px host, leaving every row and separator stranded
  // at half the surface's width.
  minWidth: '100%',
  width: 'max-content',
  maxWidth: FILTER_MAX_WIDTH,
  minHeight: FILTER_MIN_HEIGHT,
  display: 'flex',
  flexDirection: 'column',
})

/** The rule region grows to push the footer to the pane's bottom. */
export const body = style({ flex: '1 0 auto' })

export const ruleList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  padding: '6px 0',
})

/** A rule row — a plain flex run: every field sizes to ITS OWN content, no cross-row column
 *  alignment (rows are deliberately unequal). Named for what it is: there is no grid here. */
export const ruleRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
})

/** The What cell — the row's lead: row 0's field sits FLUSH at the gutter; rows 2+ lead with
 *  their And/Or connector inside this cell, indenting the field. */
export const whatCell = style({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  minWidth: 0,
})

/** The house ring CHANNEL, not a hand-rolled shadow: interactionField already paints
 *  `inset 0 0 0 1px var(--field-ring)`, so a field only sets the colour. Overriding boxShadow
 *  instead would also stomp the channel for any ancestor that sets it. */
const restRing = { vars: { '--field-ring': c.separator.line } }

/** The shared input-field recipe in its column: flush to the gutters, STANDARD field height
 *  (the interactionField 28px floor), body-size type, separator-hairline stroke. */
export const cellField = style([
  fieldBase,
  text.control.emphasized,
  {
    width: 'auto',
    flex: '0 1 auto',
    minWidth: 0,
    padding: '3px 6px',
    gap: '2px',
    border: 'none',
    cursor: 'default',
    justifyContent: 'flex-start',
    textAlign: 'left',
    color: c.label.control,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    ...restRing,
  },
])

// The label span grows to fill the field so a trailing chevron pins to the field's right edge.
globalStyle(`${cellField} > span`, {
  flex: '1 1 auto',
  minWidth: 0,
  textAlign: 'left',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
})

/** The Control (operator) cell — the row's SMALLEST-WIDTH priority. It takes exactly its own
 *  label per row and is never granted spare room, so an `Is` row's operator is visibly narrower
 *  than an `Isn't Inside` row's. It shrinks only after the two cells beside it have given way,
 *  which keeps it from becoming the widest thing in the row once space runs out. */
export const controlField = style([cellField, { flex: '0 1 auto', flexShrink: 0.2 }])

/** The Condition (value) cell — absorbs the row's leftover width so rows end flush at the pane
 *  edge, and is the first to give way under pressure (its full value stays readable in its picker). */
export const valueField = style([cellField, { flex: '1 1 auto' }])

/** The And/Or connector — a mini field in the footnote/secondary register (the trailing-option
 *  tone); never shrinks, so "And"/"Or" + its chevron stay uncramped. */
export const connector = style([
  fieldBase,
  text.control.emphasized,
  {
    width: 'auto',
    flex: '0 0 auto',
    padding: '0 6px',
    gap: '2px',
    border: 'none',
    cursor: 'default',
    color: c.label.secondary,
    ...restRing,
  },
])

export const placeholder = style({ color: c.label.tertiary })

/** The blank lead-row slots — empty fields need an explicit floor to read as fields at all; the
 *  narrow one matches the operator's compact register so the row scans {wide}{narrow}{wide}. */
export const blankWide = style({ minWidth: '58px' })
export const blankNarrow = style({ minWidth: '34px', flex: '0 0 auto' })

/** The trailing double-chevron reads a step under its field's text, matching the PickerControl
 *  triggers it shares the pane with. */
export const chevron = style({ color: c.label.secondary })

/** The row's clear-× — always shown, and in flow so it can never sit over the value field. The row's
 *  own gap is its left padding; REMOVE_INSET holds it off the trailing edge. */
export const removeButton = style({
  flex: '0 0 auto',
  marginRight: REMOVE_INSET,
  border: 'none',
  background: 'none',
  padding: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: c.label.secondary,
  cursor: 'default',
  selectors: { '&:hover': { color: c.label.primary } },
})

export const lockedCaption = style([
  text.footnote.standard,
  { color: c.label.secondary, padding: '8px 10px 4px' },
])

/** The typed value input — the cell-field recipe as a bare <input>, focus lighting the shared
 *  inset accent stroke (the TextPicker recipe). */
export const cellInput = style([
  fieldBase,
  text.control.emphasized,
  {
    // Sizes to its text (an input's intrinsic width otherwise ignores content); small floor for empty.
    fieldSizing: 'content',
    width: 'auto',
    // Absorbs the row's leftover width like the other value slots, so a text rule ends flush.
    flex: '1 1 auto',
    minWidth: '52px',
    padding: '3px 6px',
    border: 'none',
    outline: 'none',
    fontFamily: 'inherit',
    color: c.label.control,
    ...restRing,
    transition: `box-shadow ${duration.fast} ${easing.standard}`,
    selectors: {
      // Focus lights the same channel accent — the TextPicker recipe, not a second shadow.
      '&:focus, &:focus-visible': {
        outline: 'none',
        vars: { '--field-ring': tintAt('var(--accent)', TINT_STEPS.secondary) },
      },
    },
  },
])

/** The chip run inside a chips field — shrunk a step (the pane's subChip treatment rides in the
 *  component) and clipped to the cell. */
export const chipRun = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '3px',
  minWidth: 0,
  overflow: 'hidden',
})

/** An icon-bearing picker option row — leading glyph + label, left-aligned. */
export const pickerOptionRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  width: '100%',
  justifyContent: 'flex-start',
})

/** The add-rule affordance — sits at the foot of the rule list, aligned under the rows themselves
 *  rather than pinned as a footing, so adding reads as extending the list rather than a pane action. */
export const addRow = style([
  text.control.emphasized,
  {
    alignSelf: 'flex-start',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    marginTop: '2px',
    borderRadius: '5px',
    border: 'none',
    background: 'none',
    padding: 0,
    color: c.label.tertiary,
    cursor: 'default',
    selectors: { '&:hover': { background: 'var(--state-hover)', color: c.label.secondary } },
  },
])

/** The footer's leading pair — the match-mode control and its label, opposite the on/off toggle.
 *  Both live down here so the rule region keeps the full height of the pane. */
export const footerGroup = style({ display: 'inline-flex', alignItems: 'center', gap: '6px' })
export const footerLabel = style([text.control.standard, { color: c.label.secondary }])
