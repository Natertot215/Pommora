import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '@pommora/uix/Theme/color.css'
import { field, input as fieldInput } from '@pommora/uix/Fields/fields.css'
import { focusRing } from '@pommora/uix/Fields/fieldRing'
import { footingBar } from '@pommora/uix/Menus/menu-base.css'
import { tintAt } from '@pommora/uix/Theme/colors'

const c = colorVars.color
const fieldFocus = focusRing()
const restingRing = { '--field-ring': c.border.base }

/** The grid is the pane's widest fixed row, so min-content pins the popup to ITS width and the title field yields instead of stretching the pane. */
export const root = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  padding: 'var(--surface-inset)',
  width: 'min-content',
})

export const fieldRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  minWidth: 0,
})

export const iconSeat = style([
  field,
  {
    width: '28px',
    minWidth: '28px',
    flex: '0 0 auto',
    justifyContent: 'center',
    padding: 0,
    border: 'none',
    outline: 'none',
    color: c.label.secondary,
    vars: restingRing,
    transition: fieldFocus.transition,
    selectors: { '&:hover': { color: c.label.primary }, ...fieldFocus.selectors },
  },
])

export const iconSeatActive = style({
  vars: { '--field-ring': tintAt('var(--accent)', 'secondary') },
})

export const titleField = style([
  fieldInput,
  {
    flex: '1 1 auto',
    minWidth: 0,
    vars: restingRing,
    ...fieldFocus,
  },
])

export const gridFlush = style({ padding: 0 })

export const footRow = style([
  footingBar,
  {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
])
