import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '../Tokens/color.css'

const c = colorVars.color

const FILE_MAX = '85px' // KNOB — how much of a filename a label shows before it truncates

/** The label reads at the on-control tone every other label's text does; the glyph stands a step
 *  under it, so the name leads and the type follows. The pointer is its own: clicking it opens the
 *  file dialog, which is a gesture the cell around it doesn't offer. */
export const fileChip = style({
  color: c.label.control,
  cursor: 'pointer',
  vars: { '--label-max': FILE_MAX },
})

/** The type glyph, one tone below the name it introduces. */
export const fileChipIcon = style({ color: c.label.secondary })

/** The dim a reference naming nothing wears — see FileChip's `unresolved`. */
export const fileChipUnresolved = style({ opacity: 'var(--state-inactive)' })
