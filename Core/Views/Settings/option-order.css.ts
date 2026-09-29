import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '@pommora/uix/Theme/color.css'
import { text } from '@pommora/uix/Theme/typography.css'

const c = colorVars.color

/** KNOB — how far a subordinate Order row tucks toward its parent row. */
const SUB_ORDER_GAP = '-4px'

export const subOrderRow = style({ marginTop: SUB_ORDER_GAP })

export const orderLabel = style([text.body.emphasized, { color: c.label.secondary }])
