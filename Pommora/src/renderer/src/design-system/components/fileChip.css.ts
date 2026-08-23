import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '../tokens/color.css'

const c = colorVars.color

/** The chip's own tones, cap and cursor. The label reads at the on-control tone every other chip's
 *  text does; the glyph stands a step under it, so the name leads and the type follows. The pointer
 *  is the chip's own: clicking it opens the file dialog on the file it names, which is a gesture
 *  the cell around it doesn't offer.
 *
 *  The label cap is lifted for the same reason `SegmentRun` lifts it: capping each name stacks a
 *  second truncation on the run's one honest signal — its trailing edge fade — and hides the name
 *  from the scroll that would reveal it. The chip is its filename; the `OverflowScroll` it sits in
 *  is what clips and scrolls, the way every other overflowing cell reads. */
export const fileChip = style({
  color: c.label.control,
  cursor: 'pointer',
  vars: { '--chip-max': 'none' },
})

/** The type glyph, one tone below the name it introduces. */
export const fileChipIcon = style({ color: c.label.secondary })

/** The dim a reference naming nothing wears — see FileChip's `unresolved`. */
export const fileChipUnresolved = style({ opacity: 'var(--state-inactive)' })
