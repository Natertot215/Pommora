// A divided run of titles inside a field — the honest treatment for a list of plain names that
// carry no color of their own, where a chip would render as a colorless box pretending to be a
// value. The Filter pane's Location field wears it over Sets. Spacing is the run's GAP, never margins on the pieces — the tab strip's
// recipe: a divider spaced by its own margins sits evenly only while its neighbors are symmetric,
// and a trailing affordance on one segment breaks exactly that.
import { style } from '@vanilla-extract/css'
import { segment as segmentHairline } from '../../Elements/Segment/segment.css'

const SEGMENT_GAP = '4px' // KNOB
const SEGMENT_DIVIDER_INSET = '3px' // KNOB

/** KNOB — wide enough that the eclipse reads as a dissolve rather than a cut. */
const SEGMENT_FADE = 'var(--fade-strong)'

/** The run. It STRETCHES so the hairline can measure itself against the field. */
export const segmentRun = style({
  display: 'inline-flex',
  alignItems: 'stretch',
  alignSelf: 'stretch',
  flex: '1 1 auto',
  gap: SEGMENT_GAP,
  // The FIELD is what runs out of room, so the eclipse belongs here — one fade at its trailing
  // edge saying "there is more". Per-segment fades would put a gradient mid-field on every title,
  // which reads as several broken labels rather than one truncated list. `--label-max` is lifted
  // for the same reason: a chip's own 80px cap would ellipsize each title separately, stacking a
  // second truncation on top of the run's one honest signal.
  vars: { '--over-scroll-fade': SEGMENT_FADE, '--label-max': 'none' },
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

/** A segment's leading glyph, for the runs whose entries name their own. The gap beside it is the
 *  label's — a FileLabel already spaces its glyph — so this states only that a glyph never squeezes. */
export const segmentIcon = style({ flexShrink: 0 })

/** The house segment separator (Segmented), measured against the FIELD rather than given
 *  a fixed height: it stretches with the run and insets a few px, so it stays proportional if the
 *  field's type or padding ever moves. */
export const segmentDivider = style([
  segmentHairline,
  { alignSelf: 'stretch', marginBlock: SEGMENT_DIVIDER_INSET },
])
