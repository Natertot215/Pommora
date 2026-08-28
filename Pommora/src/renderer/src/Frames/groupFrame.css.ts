import { globalStyle, style } from '@vanilla-extract/css'
import { vars as colorVars } from '@renderer/DesignSystem/Tokens/color.css'
import { text } from '@renderer/DesignSystem/Tokens/typography.css'
import { pickerValue } from '@renderer/DesignSystem/Elements/PickerControl'

const c = colorVars.color

/** KNOB — how far a subordinate Order row tucks toward its parent row. */
const SUB_ORDER_GAP = '-4px'

export const subRow = style({ marginTop: SUB_ORDER_GAP })

export const subLabel = style([text.body.emphasized, { color: c.label.secondary }])

/** KNOB — the hierarchy's disclosed sub-group chips render a step smaller than table chips. */
export const subChip = style({ zoom: 0.85 })

export const pickerTone = style({})
globalStyle(`${pickerTone} ${pickerValue}${pickerValue}${pickerValue}`, { color: c.label.control })

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

export const rowHoverScope = style({})

export const revealEye = style({
  selectors: {
    '&&': { opacity: 0 },
    [`${rowHoverScope}:hover &&`]: { opacity: 'var(--state-ghost)' },
    [`${rowHoverScope}:hover &&:hover`]: { opacity: 1 },
  },
})
