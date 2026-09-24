import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '@pommora/uix/Theme/color.css'
import { text } from '@pommora/uix/Theme/typography.css'

const c = colorVars.color

/** KNOB — how far a subordinate Order row tucks toward its parent row. */
const SUB_ORDER_GAP = '-4px'

export const subRow = style({ marginTop: SUB_ORDER_GAP })

export const subLabel = style([text.body.emphasized, { color: c.label.secondary }])

/** KNOB — the middle region's scroll ceiling. */
const MIDDLE_MAX_HEIGHT = '280px'

export const middle = style({
  position: 'relative',
  maxHeight: MIDDLE_MAX_HEIGHT,
  overflowY: 'auto',
  vars: { '--over-scroll-fade': 'var(--fade-base)' },
})

export const dropLineInset = style({ left: '8px', right: '8px' })

export const ghosted = style({ opacity: 'var(--state-ghost)' })
