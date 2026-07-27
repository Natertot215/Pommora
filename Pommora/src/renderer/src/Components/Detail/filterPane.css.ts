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
import { titleReveal } from '../../design-system/animations.css'
import { vars as colorVars } from '../../design-system/tokens/color.css'
import { text } from '../../design-system/tokens/typography.css'
import { field as fieldBase } from '../../design-system/components/interactionField.css'
import { focusRing } from '../../design-system/components/fieldRing'
import { divider as segmentHairline } from '../../design-system/components/Segmented-Controls/segmented.css'

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
    // Rigid by default: a cell naming the rule (What, Operator) must stay whole at any pane
    // width. Only the value cell opts back into shrinking, so it alone absorbs the overflow.
    flex: '0 0 auto',
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

/** The Control (operator) cell — takes exactly its own label, so an `Is` row's operator is
 *  visibly narrower than an `Isn't Inside` row's. Rigid like the What cell it follows. */
export const controlField = style([cellField, { flex: '0 0 auto' }])

/** The Condition (value) cell — absorbs the row's leftover width so rows end flush at the pane
 *  edge, and is the ONLY cell that gives way: What and Operator name the rule and stay whole at
 *  any pane width, while the value truncates (its full text stays readable in its picker). */
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

/** KNOB — the field-edge fade on an overflowing Location run. Wider than the house default because
 *  it dissolves a whole run rather than one word, and the × it clears sits inside that ramp. */
const SEGMENT_FADE = '30px'

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
  // The FIELD is what runs out of room, so the eclipse belongs here — one fade at the field's
  // trailing edge saying "there is more". Per-segment fades would put a gradient mid-field on every
  // title, which reads as four broken labels rather than one truncated list.
  vars: { '--edge-fade': SEGMENT_FADE },
})

/** KNOB — a segment's glyph gap. Tighter than the field's LEAD_GAP on purpose: a segment is a
 *  compact unit INSIDE a field, so it reads as one token rather than a second field. */
const SEGMENT_ICON_GAP = '4px'

/** A segment's label — plain and unclipped. The truncation signal is the RUN's, one field-edge fade
 *  for the whole list; a label that masked itself too would stack a second gradient on the same text. */
export const segmentLabel = style({ whiteSpace: 'nowrap' })

/** A segment's leading glyph — the Set's own icon, or the entity default when it has none, so a
 *  segment and its picker row always read as the same thing. */
export const segmentIcon = style({ marginRight: SEGMENT_ICON_GAP, flexShrink: 0 })

/** One Set in that run — its glyph, its title, and the slot its × opens into. The × never overlays
 *  the label, so a segment carries none of the chip melt machinery. */
export const segment = style({
  display: 'inline-flex',
  alignItems: 'center',
  // Segments hold their natural width so the RUN is what overflows and fades; letting each one
  // squeeze instead would truncate every title a little rather than the list as a whole.
  flexShrink: 0,
  whiteSpace: 'nowrap',
})

/** The ×'s SLOT — collapsed to nothing at rest, opening to the glyph's width when its segment is
 *  hovered, so the segment elongates to make room instead of the × landing on the title. The house
 *  `0fr ↔ 1fr` morph (the segmented control's label slot; `Reveal` is its vertical twin), which
 *  collapses the leading gap along with the width — a resting segment is pixel-identical to one that
 *  never had a ×. */
export const segmentRemoveSlot = style({
  display: 'inline-grid',
  gridTemplateColumns: '0fr',
  marginLeft: 0,
  minWidth: 0,
  overflow: 'hidden',
  transition: `grid-template-columns ${titleReveal}, margin-left ${titleReveal}`,
  selectors: {
    [`${segment}:hover &`]: { gridTemplateColumns: '1fr', marginLeft: TRAILING_GAP },
  },
})

/** The × itself. The opacity lives HERE, not on the slot: the shared remove gates its click on its
 *  own computed opacity, so a transparent button inside an open slot would still remove. */
export const segmentRemove = style({
  // The grid ITEM has to zero its own floor or the slot can't close: `0fr` resolves to
  // `minmax(auto, 0fr)`, and that `auto` is the item's min-content width. Reveal and the segmented
  // control's label slot each do the same on their inner box.
  minWidth: 0,
  overflow: 'hidden',
  border: 'none',
  background: 'none',
  padding: 0,
  display: 'inline-flex',
  alignItems: 'center',
  color: c.label.secondary,
  cursor: 'pointer',
  opacity: 0,
  transition: `opacity ${titleReveal}`,
  selectors: {
    [`${segment}:hover &`]: { opacity: 1 },
    '&:hover': { color: c.label.primary },
  },
})

/** The house segment separator (Segmented-Controls), measured against the FIELD rather than given a
 *  fixed height: it stretches with the run and insets a few px, so it stays proportional if the
 *  field's type or padding ever moves. The control in Segmented-Controls sets its height per
 *  instance for the same reason — a toolbar pill and a field line are different bars. */
export const segmentDivider = style([
  segmentHairline,
  { alignSelf: 'stretch', marginBlock: SEGMENT_DIVIDER_INSET },
])

/** The Operator cell when its operator takes NO operand (Is Empty, Is Checked, Has File). With no
 *  value cell to absorb it, the operator takes the row's leftover width itself — the last field
 *  present always runs to the trailing edge, so a two-field row reads as full width rather than
 *  trailing off into a gap. */
export const controlFieldWide = style([cellField, { flex: '1 1 auto' }])

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
