import { style } from '@vanilla-extract/css'
import { topRow } from '@pommora/uix/Menus/menu-row.css'

export const chooserTop = style([topRow, { vars: { '--row-pad-y': '0px' } }])

// Keeps the pane's proportions so an emptied option list doesn't collapse to nothing.
export const emptyPane = style({ minWidth: 96, height: 24 })
