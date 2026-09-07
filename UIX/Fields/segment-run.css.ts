// Spacing is the run's GAP, never margins on the pieces: a divider spaced by its own margins sits evenly only while its neighbors are symmetric, and a trailing affordance breaks that.
import { style } from '@vanilla-extract/css'
import { segment as segmentHairline } from '../Elements/segment.css'

const SEGMENT_GAP = '4px' // KNOB
const SEGMENT_DIVIDER_INSET = '4px' // KNOB

/** KNOB — the trailing eclipse's fade width. */
const SEGMENT_FADE = 'var(--fade-strong)'

/** STRETCHES so the hairline can measure itself against the field. */
export const segmentRun = style({
  display: 'inline-flex',
  alignItems: 'stretch',
  alignSelf: 'stretch',
  flex: '1 1 auto',
  gap: SEGMENT_GAP,
  // The FIELD is what runs out of room, so one fade sits at its trailing edge: per-segment fades would read as several broken labels. `--label-max` is lifted for the same reason.
  vars: { '--over-scroll-fade': SEGMENT_FADE, '--label-max': 'none' },
})

/** Natural width so the RUN overflows; squeezing would truncate every title a little rather than the list as a whole. */
export const segment = style({
  display: 'inline-flex',
  alignItems: 'center',
  flexShrink: 0,
  whiteSpace: 'nowrap',
})

/** The gap beside the glyph is the label's own — a FileLabel already spaces it. */
export const segmentIcon = style({ flexShrink: 0 })

/** Measured against the FIELD rather than given a fixed height, so it stays proportional if the field's type or padding moves. */
export const segmentDivider = style([
  segmentHairline,
  { alignSelf: 'stretch', marginBlock: SEGMENT_DIVIDER_INSET },
])
