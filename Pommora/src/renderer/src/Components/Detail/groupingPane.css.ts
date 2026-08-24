// The Grouping pane's row-tier knobs. Primary rows (Group By / Sub-Group / Date By) read the
// MenuItem default; a subordinate Order row reads a step quieter and tucks toward its parent
// so the pair reads grouped.
import { globalStyle, style } from '@vanilla-extract/css'
import { vars as colorVars } from '@renderer/DesignSystem/Tokens/color.css'
import { text } from '@renderer/DesignSystem/Tokens/typography.css'
import { value as pickerValue } from './pickerControl.css'

const c = colorVars.color

/** KNOB — how far a subordinate Order row tucks toward its parent row. */
const SUB_ORDER_GAP = '-4px'

export const subRow = style({ marginTop: SUB_ORDER_GAP })

export const subLabel = style([text.body.emphasized, { color: c.label.secondary }])

/** KNOB — the hierarchy's disclosed sub-group chips render a step smaller than table chips. */
export const subChip = style({ zoom: 0.85 })

/** The Group By row's trailing value — matches the PickerControl trigger's weight class, a step
 *  LARGER than the menus' Footnote detail so the pane's lead value reads at full strength. */
export const groupByValue = style([
  text.control.standard,
  { color: c.label.control, display: 'inline-flex', alignItems: 'center', gap: '4px' },
])

/** Scope class for the pane's rows: every grouping picker's value reads a step brighter than the
 *  shared PickerControl's default (triple-class to outrank its `&&`). */
export const pickerTone = style({})
globalStyle(`${pickerTone} ${pickerValue}${pickerValue}${pickerValue}`, { color: c.label.control })

/** KNOB — the middle region's scroll ceiling. */
const MIDDLE_MAX_HEIGHT = '280px'

/** The scrollable order region between the dividers — wears the shared block-axis fade, the class
 *  riding in the component (the Icon Picker precedent). */
export const middle = style({
  position: 'relative',
  maxHeight: MIDDLE_MAX_HEIGHT,
  overflowY: 'auto',
  vars: { '--over-scroll-fade': '16px' },
})

/** The pane's own gutter for the shared `drop-line` — wider than the token default so the
 *  line clears the hierarchy rail. */
export const dropLineInset = style({ left: '8px', right: '8px' })

/** The picked-up row's in-place fade. */
export const ghosted = style({ opacity: 'var(--state-ghost)' })

/** A preview group heading (the muted footing tone) with its chips beneath. */
export const previewHeading = style([
  text.footnote.emphasized,
  { color: c.label.secondary, padding: '6px 8px 2px' },
])
export const chipRow = style({ display: 'flex', alignItems: 'center', padding: '3px 8px' })

/** The group-row eye's right-edge slot — pushes the toggle flush against the row's end. */
export const eyeSlot = style({ marginLeft: 'auto', display: 'flex' })

/** Hover scope for a folder row's revealed eye — the wrap div around the row alone. */
export const rowHoverScope = style({})

/** The folder row's hover-revealed eye — invisible until its row is hovered (`&&` outranks the
 *  accessory rest-ghost at equal specificity). A hidden row skips this class, so its eye rides
 *  the plain always-visible recipe. */
export const revealEye = style({
  selectors: {
    '&&': { opacity: 0 },
    [`${rowHoverScope}:hover &&`]: { opacity: 'var(--state-ghost)' },
    [`${rowHoverScope}:hover &&:hover`]: { opacity: 1 },
  },
})
