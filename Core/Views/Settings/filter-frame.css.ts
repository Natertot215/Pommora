import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '@pommora/uix/Theme/color.css'
import { field as fieldBase, borderedField } from '@pommora/uix/Fields/fields.css'
import { focusRing } from '@pommora/uix/Fields/fieldRing'
import { growToContent } from '@pommora/uix/Menus/frameGrowth'
import { rowBox } from '@pommora/uix/Menus/menu-row.css'
import { PANE_MIN_H } from '@pommora/uix/Menus/frame-slide.css'

const c = colorVars.color

/** KNOB — the pane's content-driven width ceiling. */
const FILTER_MAX_WIDTH = '420px'

/** KNOB — the trailing chevron's distance from its label. Tighter than the lead on purpose: the Operator cell is the row's compactness priority. */
const TRAILING_GAP = '2px'

/** KNOB — the clear-×'s breathing room off the row's trailing edge. */
const REMOVE_INSET = '2px'

export const frame = style({
  ...growToContent(FILTER_MAX_WIDTH),
  minHeight: `${PANE_MIN_H}px`,
})

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

export const controlField = style([cellField, { flex: '0 0 auto' }])

export const valueField = style([cellField, { flex: '1 1 auto' }])

export const connector = style([
  fieldBase,
  {
    width: 'auto',
    flex: '0 0 auto',
    padding: '0 var(--row-pad-standard)',
    border: 'none',
    cursor: 'default',
    color: c.label.secondary,
    vars: { '--field-ring': c.border.base },
  },
])

export { placeholder } from '@pommora/uix/Fields/fields.css'

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
