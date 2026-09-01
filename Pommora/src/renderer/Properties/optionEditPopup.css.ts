import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '@renderer/DesignSystem/Tokens/color.css'
import { field, input as fieldInput } from '@renderer/DesignSystem/Fields/fields.css'
import { focusRing } from '@renderer/DesignSystem/Fields/fieldRing'
import { footingBar } from '@renderer/DesignSystem/Menus/menu-base.css'
import { tintAt } from '@renderer/DesignSystem/Tokens/tint'

const c = colorVars.color
const seatFocus = focusRing()

/** The grid is the pane's widest fixed row, so min-content pins the popup to ITS width and the
 *  title field yields instead of stretching the pane. */
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

/** The icon seat is a square of the SAME field chrome the title wears, so the pair reads as one
 *  input run. */
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
    vars: { '--field-ring': c.border.base },
    transition: seatFocus.transition,
    selectors: { '&:hover': { color: c.label.primary }, ...seatFocus.selectors },
  },
])

/** Held while its picker is up — the seat stays ringed as the field being edited. */
export const iconSeatActive = style({
  vars: { '--field-ring': tintAt('var(--accent)', 'secondary') },
})

export const titleField = style([
  fieldInput,
  {
    flex: '1 1 auto',
    minWidth: 0,
    vars: { '--field-ring': c.border.base },
    ...focusRing(),
  },
])

export const gridFlush = style({ padding: 0 })

/** Composes footingBar so the PickerControl inside takes the footing's footnote sizing. */
export const footRow = style([
  footingBar,
  {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
])
