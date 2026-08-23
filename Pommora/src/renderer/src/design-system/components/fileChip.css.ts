import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '../tokens/color.css'

const c = colorVars.color

const CHIP_MAX = '65px' // KNOB — how much of a filename a chip shows before the ellipsis

/** The chip's own tones, cap and cursor. The label reads at the on-control tone every other chip's
 *  text does; the glyph stands a step under it, so the name leads and the type follows. The pointer
 *  is the chip's own: clicking it opens the file dialog on the file it names, which is a gesture
 *  the cell around it doesn't offer. */
export const fileChip = style({
  color: c.label.control,
  cursor: 'pointer',
  vars: { '--chip-max': CHIP_MAX },
})

/** The type glyph, one tone below the name it introduces. */
export const fileChipIcon = style({ color: c.label.secondary })

/** The name answers to no file. It still renders — the value is on disk and has to be removable —
 *  but reads as naming nothing. */
export const fileChipUnresolved = style({ opacity: 'var(--state-inactive)' })
