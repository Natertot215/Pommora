// Spacing is the run's GAP, never margins on the pieces: a divider spaced by its own margins sits evenly only while its neighbors are symmetric, and a trailing affordance breaks that.
import { style } from '@vanilla-extract/css'
import { segment } from '../Elements/segment.css'

const RUN_GAP = '4px' // KNOB
const RUN_DIVIDER_INSET = '4px' // KNOB

/** KNOB — the trailing eclipse's fade width. */
const RUN_FADE = 'var(--fade-strong)'

/** STRETCHES so the hairline can measure itself against the field. */
export const fieldRun = style({
  display: 'inline-flex',
  alignItems: 'stretch',
  alignSelf: 'stretch',
  flex: '1 1 auto',
  gap: RUN_GAP,
  // The FIELD is what runs out of room, so one fade sits at its trailing edge: per-item fades would read as several broken labels. `--label-max` is lifted for the same reason.
  vars: { '--scroll-fade': RUN_FADE, '--label-max': 'none' },
})

/** Natural width so the RUN overflows; squeezing would truncate every title a little rather than the list as a whole. */
export const runItem = style({
  display: 'inline-flex',
  alignItems: 'center',
  flexShrink: 0,
  whiteSpace: 'nowrap',
})

/** The gap beside the glyph is the label's own — a PlainLabel already spaces it. */
export const runItemIcon = style({ flexShrink: 0 })

/** Measured against the FIELD rather than given a fixed height, so it stays proportional if the field's type or padding moves. */
export const runDivider = style([segment, { alignSelf: 'stretch', marginBlock: RUN_DIVIDER_INSET }])
