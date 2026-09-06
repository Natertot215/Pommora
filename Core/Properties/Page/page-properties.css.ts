import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '@pommora/uix/Theme/color.css'
import { text } from '@pommora/uix/Theme/typography.css'
import { item, titleText } from '@pommora/uix/Menus/menu-base.css'
import { growToContent } from '@pommora/uix/Menus/frame-growth'

const c = colorVars.color

/** KNOB — the pane's content-driven width ceiling. */
const PAGE_PROPERTIES_MAX_WIDTH = '350px'

export const frame = style({
  ...growToContent(PAGE_PROPERTIES_MAX_WIDTH),
  display: 'flex',
  flexDirection: 'column',
})

export const rows = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  padding: '4px 0 6px',
})

export const panelRows = style([
  rows,
  { flex: 1, minHeight: 0, overflowY: 'auto', scrollbarWidth: 'none', padding: '0 4px 4px' },
])

export const group = style({
  display: 'flex',
  flexDirection: 'column',
  padding: '2px',
  borderRadius: '8px',
  background: c.fill.tertiary,
})

export const row = style([item])

export const label = style([titleText, { flex: '0 1 auto' }])

/** Content-sized and pushed right, so a picker anchors to the value rather than to the row's empty middle. */
export const value = style({
  marginLeft: 'auto',
  flex: '0 1 auto',
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  textAlign: 'right',
})

export const empty = style([text.caption.standard])

export const add = style({ alignSelf: 'flex-start', color: c.label.secondary })
