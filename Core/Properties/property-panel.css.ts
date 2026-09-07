import { globalStyle, style } from '@vanilla-extract/css'
import { vars as colorVars } from '@pommora/uix/Theme/color.css'
import { text } from '@pommora/uix/Theme/typography.css'
import { item, side } from '@pommora/uix/Menus/menu-base.css'
import { growToContent } from '@pommora/uix/Menus/frame-growth'

const c = colorVars.color

// KNOB — the page-frame pane's content-driven width ceiling.
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
  padding: '4px 0 6px',
})

export const group = style({
  display: 'flex',
  flexDirection: 'column',
  padding: '2px',
  borderRadius: '8px',
  background: c.fill.tertiary,
})

export const row = style([item])

export const value = style({
  flex: '0 1 auto',
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  textAlign: 'right',
})

globalStyle(`${row} > .${side}:last-child`, { flex: '0 1 auto', minWidth: 0 })

export const empty = style([text.caption.standard])

export const add = style({ alignSelf: 'flex-start', color: c.label.secondary })
