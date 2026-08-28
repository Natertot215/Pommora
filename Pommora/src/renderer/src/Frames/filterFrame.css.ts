import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '@renderer/DesignSystem/Tokens/color.css'
import { text } from '@renderer/DesignSystem/Tokens/typography.css'
import {
  field as fieldBase,
  borderedField,
} from '@renderer/DesignSystem/Components/Fields/fields.css'
import { focusRing } from '@renderer/DesignSystem/Components/Fields/fieldRing'
import { growToContent } from '@renderer/DesignSystem/Menus/frame-growth'
import { rowBox, side } from '@renderer/DesignSystem/Menus/menu-base.css'

const c = colorVars.color

/** KNOB — the pane's content-driven width ceiling. */
const FILTER_MAX_WIDTH = '420px'

/** KNOB — a leading glyph's distance from its label. The picker option row's gap, so an icon sits
 *  exactly as far off its label inside a field as it does in the menu that field opens. */
const LEAD_GAP = '6px'

/** KNOB — the trailing chevron's distance from its label. Tighter than the lead on purpose: the
 *  Operator cell is the row's compactness priority, and its chevron is all that stands between the
 *  label and the field's edge. */
const TRAILING_GAP = '2px'

/** KNOB — the frame's height floor (matches the hosts' leaf slider floor) so the "+" footer pins
 *  to the bottom edge like every other frame's footing. */
const FILTER_MIN_HEIGHT = '245px'

/** KNOB — the clear-×'s breathing room off the row's trailing edge. */
const REMOVE_INSET = '2px'

export const frame = style({
  ...growToContent(FILTER_MAX_WIDTH),
  minHeight: FILTER_MIN_HEIGHT,
  display: 'flex',
  flexDirection: 'column',
})

export const body = style({ flex: '1 0 auto' })

export const ruleList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  padding: '6px 0',
})

export const ruleRow = style([rowBox, { gap: '6px', paddingLeft: 0 }])

export const whatCell = style({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  flex: '0 0 auto',
})

export const cellField = style([borderedField, { width: 'auto', cursor: 'default' }])

export const fieldLabel = style({
  flex: '1 1 auto',
  textAlign: 'left',
})

/** The margin lives on this WRAPPER rather than the glyph: the checkbox box carries a `zoom`,
 *  which would scale its own margin. */
export const leadGlyph = style([side, { marginRight: LEAD_GAP }])

export const controlField = style([cellField, { flex: '0 0 auto' }])

export const valueField = style([cellField, { flex: '1 1 auto' }])

export const connector = style([
  fieldBase,
  {
    width: 'auto',
    flex: '0 0 auto',
    padding: '0 var(--row-width-standard)',
    border: 'none',
    cursor: 'default',
    color: c.label.secondary,
    vars: { '--field-ring': c.border.base },
  },
])

export { placeholder } from '@renderer/DesignSystem/Components/Fields/fields.css'

export const blankWide = style({ minWidth: '58px' })
export const blankNarrow = style({ minWidth: '34px', flex: '0 0 auto' })

export const chevron = style({
  color: c.label.secondary,
  marginLeft: TRAILING_GAP,
  flexShrink: 0,
})

export const removeButton = style({
  flex: '0 0 auto',
  marginRight: REMOVE_INSET,
  border: 'none',
  background: 'none',
  padding: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: c.label.secondary,
  cursor: 'default',
  selectors: { '&:hover': { color: c.label.primary } },
})

export const lockedCaption = style([
  text.footnote.standard,
  { color: c.label.secondary, padding: '8px 10px 4px' },
])

export const cellInput = style([
  borderedField,
  {
    fieldSizing: 'content',
    width: 'auto',
    flex: '1 1 auto',
    minWidth: '52px',
    ...focusRing(),
  },
])

export const chipRun = style({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '3px',
  flex: '1 1 auto',
})

export const controlFieldWide = style([cellField, { flex: '1 1 auto' }])
