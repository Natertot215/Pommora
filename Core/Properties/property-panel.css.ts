import { globalStyle, style } from '@vanilla-extract/css'
import { vars as colorVars } from '@pommora/uix/Theme/color.css'
import { text } from '@pommora/uix/Theme/typography.css'
import { ROW_RADIUS, item, side } from '@pommora/uix/Menus/menu-row.css'
import { growToContent } from '@pommora/uix/Menus/frameGrowth'

const c = colorVars.color

// KNOB — the dropdown panel's content-driven width ceiling.
const PANEL_MAX_WIDTH = '350px'

export const frame = style({
  ...growToContent(PANEL_MAX_WIDTH),
  display: 'flex',
  flexDirection: 'column',
})

export const panelRows = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  scrollbarWidth: 'none',
  padding: '0 4px 4px',
})

export const pageRows = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  padding: '0 0 6px',
})

export const group = style({
  display: 'flex',
  flexDirection: 'column',
  padding: '2px',
  borderRadius: '8px',
  background: c.fill.tertiary,
})

export const row = style([item])

export const addSlot = style({ borderRadius: `${ROW_RADIUS}px` })

export const value = style({
  flex: '0 1 auto',
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  textAlign: 'right',
})

/* The value grows from nothing into the room the label leaves, up to the row's reach, so a label that fits is never shrunk by a long value; the value's grow weight dwarfs the label's 1. */
globalStyle(`${side}:has(> ${value})`, {
  flex: '1000 1 0',
  minWidth: 0,
  justifyContent: 'flex-end',
})

export const empty = style([text.caption.standard, { paddingRight: 'var(--row-pad-standard)' }])

export const groupBordered = style({ border: `var(--width-100) solid ${c.border.base}` })
