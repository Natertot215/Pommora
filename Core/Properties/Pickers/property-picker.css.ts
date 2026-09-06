import { style } from '@vanilla-extract/css'
import { topRow } from '@pommora/uix/Menus/menu-base.css'

// Composing `topRow` (not a bare class) guarantees this override lands after it in the cascade, so the chooser header keeps its flat, zero-padding back row.
export const chooserTop = style([topRow, { vars: { '--row-pad-y': '0px' } }])
