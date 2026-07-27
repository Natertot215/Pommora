// The FilterPane's rule rows + field variants. A row is a free flex run — connector · what ·
// operator · value · remove — with NO cross-row column alignment: every field sizes to its own
// row's content, so a short operator gets a short field regardless of what any other row holds.
// Sizing priority within a row: the operator hugs its label and is never granted spare width, the
// value absorbs what's left and yields first, and the pane fills its host before stretching with
// content toward the max-width knob. Fields wear control typography, and the remove × sits in flow
// at the row's trailing edge so it can never overlap the value.
// A field's glyphs space THEMSELVES: a leading icon and a trailing chevron want different gaps, and
// one container `gap` can only state one — so each role carries its own margin and the field sets none.
import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '../../design-system/tokens/color.css'
import { text } from '../../design-system/tokens/typography.css'
import { field as fieldBase } from '../../design-system/components/interactionField.css'
import { focusRing } from '../../design-system/components/fieldRing'
import { divider as segmentHairline } from '../../design-system/components/Segmented-Controls/segmented.css'
import { chipRemovable } from '../../design-system/tokens/chip.css'

const c = colorVars.color

/** KNOB — the pane's content-driven width ceiling. */
const FILTER_MAX_WIDTH = '420px'

/** KNOB — a leading glyph's distance from its label. The picker option row's gap, so an icon sits
 *  exactly as far off its label inside a field as it does in the menu that field opens. */
const LEAD_GAP = '6px'

/** KNOB — the trailing chevron's distance from its label. Tighter than the lead on purpose: the
 *  Operator cell is the row's compactness priority, and its chevron is all that stands between the
 *  label and the field's edge. */
const TRAILING_GAP = '2px'

/** KNOB — the pane's height floor (matches the hosts' leaf slider floor) so the "+" footer pins
 *  to the bottom edge like every other pane's footing. */
const FILTER_MIN_HEIGHT = '245px'

/** KNOB — the clear-×'s breathing room off the row's trailing edge. */
const REMOVE_INSET = '2px'

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
 *  (the interactionField 28px floor), separator-hairline stroke, and the house field's own BODY
 *  type — a filter row is content the user reads, not chrome, so it holds the reading size rather
 *  than the compact control scale (which shrank the chips inside it to match). */
export const cellField = style([
  fieldBase,
  {
    width: 'auto',
    flex: '0 1 auto',
    minWidth: 0,
    padding: '3px 6px',
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

/** A field's label — grows to fill, so a trailing chevron pins to the field's right edge. Carried
 *  by the label ITSELF rather than a `> span` descendant rule: a field's other spans are glyphs (the
 *  checkbox lead) and a rule keyed on tag position hands them the label's grow and clipping. */
export const fieldLabel = style({
  flex: '1 1 auto',
  minWidth: 0,
  textAlign: 'left',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
})

/** A field's LEADING glyph slot — the property/type icon or the checkbox box. Holds the picker's
 *  lead gap so a glyph reads identically in the field and in the menu that field opens, and never
 *  shrinks (a squeezed row must eat the label, never the glyph). The margin lives on this WRAPPER
 *  rather than the glyph: the checkbox box carries a `zoom`, which would scale its own margin. */
export const leadGlyph = style({
  display: 'inline-flex',
  alignItems: 'center',
  marginRight: LEAD_GAP,
  flexShrink: 0,
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
  {
    width: 'auto',
    flex: '0 0 auto',
    padding: '0 6px',
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
 *  triggers it shares the pane with. Owns its gap off the label, so the field states none. */
export const chevron = style({
  color: c.label.secondary,
  marginLeft: TRAILING_GAP,
  flexShrink: 0,
})

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
    ...focusRing(),
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

/** KNOB — the segment hairline's height inside a field (the control type's cap band), and its
 *  breathing room either side, and how far the hairline insets from the field's inner edges. */
const SEGMENT_GAP = '5px'
const SEGMENT_DIVIDER_INSET = '3px'

/** A Location run — the picked Sets divided by the house segment hairline. A Set carries no colour
 *  of its own, so a chip would render as a colourless box pretending to be a value; a divided run
 *  is the honest treatment for a list of plain titles.
 *  Spacing is the run's GAP, never margins on the pieces — the tab strip's recipe. A divider spaced
 *  by its own margins sits evenly only while its neighbours are symmetric, and a segment's trailing
 *  × breaks exactly that. It STRETCHES so the hairline can measure itself against the field. */
export const segmentRun = style({
  display: 'inline-flex',
  alignItems: 'stretch',
  alignSelf: 'stretch',
  flex: '1 1 auto',
  gap: SEGMENT_GAP,
  minWidth: 0,
  overflow: 'hidden',
})

/** KNOB — a segment's glyph gap. Tighter than the field's LEAD_GAP on purpose: a segment is a
 *  compact unit INSIDE a field, so it reads as one token rather than a second field. */
const SEGMENT_ICON_GAP = '4px'

/** KNOB — how far a segment's label fades before the ×. Wide enough that the glyph never lands on
 *  a solid letter; the shared eclipse mask does the rest. */
const SEGMENT_FADE = '18px'

/** A segment's label — the tab strip's eclipse box, tuned so its trailing fade clears the ×. */
export const segmentLabel = style({
  minWidth: 0,
  vars: { '--edge-fade': SEGMENT_FADE },
})

/** A segment's leading glyph — the Set's own icon, or the entity default when it has none, so a
 *  segment and its picker row always read as the same thing. */
export const segmentIcon = style({ marginRight: SEGMENT_ICON_GAP, flexShrink: 0 })

/** One Set in that run — its glyph and title, and the host for the shared remove-×. It wears
 *  `chipRemovable`: that class is the melt family's HOST marker, not a chip shape, so composing it
 *  hands a plain segment the same hover-reveal + label-tail blur without a chip's fill or border. */
export const segment = style([
  chipRemovable,
  {
    display: 'inline-flex',
    alignItems: 'center',
    minWidth: 0,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    selectors: {
      // The × is never what sizes a segment. The TRAILING one absorbs the field's slack, so its ×
      // lands out at the field's edge in empty space instead of sitting on the title's last letters.
      // An interior segment has no slack to take, so its × falls back to the chip behaviour — over
      // the tail, with the tail blurring beneath it.
      '&:last-child': { flex: '1 1 auto' },
    },
  },
])

/** The house segment separator (Segmented-Controls), measured against the FIELD rather than given a
 *  fixed height: it stretches with the run and insets a few px, so it stays proportional if the
 *  field's type or padding ever moves. The control in Segmented-Controls sets its height per
 *  instance for the same reason — a toolbar pill and a field line are different bars. */
export const segmentDivider = style([
  segmentHairline,
  { alignSelf: 'stretch', marginBlock: SEGMENT_DIVIDER_INSET },
])

// A segment's clear-× has NO skin of its own: it is ChipRemoveButton at its default, so the reveal,
// the pointer cursor, the reveal-gated click AND the label-tail blur beneath it all come from the one
// place that owns them. That machinery was never chip-specific — it only ever needed a `chipRemovable`
// host and a `ChipLabel`, which `segment` and the segment's label now supply.

/** The value slot for an operator that takes NO operand (Is Empty, Is Checked, Has File). It holds
 *  the row's leftover width so the × stays pinned at the trailing edge like every other row, but
 *  paints nothing — an empty field would advertise an operand the operator can't accept. */
export const valueSpacer = style({ flex: '1 1 auto', minWidth: 0 })

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
