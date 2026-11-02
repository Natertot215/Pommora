import { style } from '@vanilla-extract/css'

// Keeps the pane's proportions so an emptied option list doesn't collapse to nothing.
export const emptyPane = style({ minWidth: 96, height: 24 })
