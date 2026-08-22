// A divided run of titles inside a field — the honest treatment for a list of plain names that
// carry no color of their own, where a chip would render as a colorless box pretending to be a
// value. The Filter pane's Location field wears it over Sets; the asset-directory row wears it
// over path segments. Spacing is the run's GAP, never margins on the pieces — the tab strip's
// recipe: a divider spaced by its own margins sits evenly only while its neighbors are symmetric,
// and a trailing affordance on one segment breaks exactly that.
import { style } from '@vanilla-extract/css'
import { divider as segmentHairline } from '../Segmented-Controls/segmented.css'
import { vars as colorVars } from '../../tokens/color.css'
import { font } from '../../tokens/typography.css'

const SEGMENT_GAP = '5px' // KNOB
const SEGMENT_DIVIDER_INSET = '3px' // KNOB

/** KNOB — a segment's glyph gap. Tighter than a field's own lead gap on purpose: a segment is a
 *  compact unit INSIDE a field, so it reads as one token rather than a second field. */
const SEGMENT_ICON_GAP = '4px'

/** KNOB — wide enough that the eclipse reads as a dissolve rather than a cut. */
const SEGMENT_FADE = '30px'

/** The run. It STRETCHES so the hairline can measure itself against the field. */
export const segmentRun = style({
  display: 'inline-flex',
  alignItems: 'stretch',
  alignSelf: 'stretch',
  flex: '1 1 auto',
  gap: SEGMENT_GAP,
  // The FIELD is what runs out of room, so the eclipse belongs here — one fade at its trailing
  // edge saying "there is more". Per-segment fades would put a gradient mid-field on every title,
  // which reads as several broken labels rather than one truncated list.
  vars: { '--edge-fade': SEGMENT_FADE },
})

/** One entry — its glyph and its title. Segments hold their natural width so the RUN is what
 *  overflows and fades; letting each one squeeze would truncate every title a little rather than
 *  the list as a whole. */
export const segment = style({
  display: 'inline-flex',
  alignItems: 'center',
  flexShrink: 0,
  whiteSpace: 'nowrap',
})

/** A segment's label — plain and unclipped. The truncation signal belongs to the run, one
 *  field-edge fade for the whole list; a label that masked itself too would stack a second
 *  gradient on the same text. */
export const segmentLabel = style({ whiteSpace: 'nowrap' })

/** A segment's leading glyph. */
export const segmentIcon = style({ marginRight: SEGMENT_ICON_GAP, flexShrink: 0 })

/** The house segment separator (Segmented-Controls), measured against the FIELD rather than given
 *  a fixed height: it stretches with the run and insets a few px, so it stays proportional if the
 *  field's type or padding ever moves. What a FLAT run wears — the entries stand beside each
 *  other and none contains another. */
export const segmentDivider = style([
  segmentHairline,
  { alignSelf: 'stretch', marginBlock: SEGMENT_DIVIDER_INSET },
])

/** What a NESTED run wears instead. The hairline separates VALUES standing beside each other; a
 *  path's entries each sit inside the one before, which is the breadcrumb's own `›` — same glyph,
 *  same control-size bold as the subfield's, one tone dimmer so the run reads as names first. */
export const segmentChevron = style({
  flex: 'none',
  alignSelf: 'center',
  fontSize: font.scale.control.size,
  fontWeight: font.weight.bold,
  color: colorVars.color.label.tertiary,
})
