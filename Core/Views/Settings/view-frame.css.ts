import { globalStyle, style } from '@vanilla-extract/css'
import { vars } from '@pommora/uix/Theme/color.css'

export const chevronButton = style({ color: vars.color.label.secondary })

/** The views list's closing row, below every view and outside their reorder: its text reads as a view's chevron does, its glyph and lock a step quieter. */
export const archiveRow = style({ color: vars.color.label.secondary })
export const archiveGlyph = style({ color: vars.color.label.tertiary })
export const archiveDivider = style({})
globalStyle(`${archiveDivider} > *`, { background: vars.color.border.light })
