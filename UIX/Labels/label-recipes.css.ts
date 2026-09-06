import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '../Theme/color.css'

const c = colorVars.color

const FILE_MAX = '85px' // KNOB — filename truncation width

/** Its own pointer: clicking opens the file dialog, a gesture the cell around it doesn't offer. */
export const fileChip = style({
  color: c.label.control,
  cursor: 'pointer',
  vars: { '--label-max': FILE_MAX },
})

export const fileChipIcon = style({ color: c.label.secondary })

export const fileChipUnresolved = style({ opacity: 'var(--state-inactive)' })
