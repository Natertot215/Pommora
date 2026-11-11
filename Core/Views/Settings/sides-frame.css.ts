import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '@pommora/uix/Theme/color.css'
import { frameZone } from '@pommora/uix/Menus/frames.css'
import { ROW_RADIUS } from '@pommora/uix/Menus/menu-row.css'

// KNOBS — the two columns
const PANE = { width: 180, gap: 8 }

/* Two equal tracks as wide as the wider column's rows need, so a row carried across keeps its width; a column stands no wider than `PANE.width`. */
export const columns = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: `${PANE.gap}px`,
})

export const column = style({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  maxWidth: `${PANE.width}px`,
})

export const list = style([
  frameZone,
  { borderRadius: `${ROW_RADIUS}px`, background: colorVars.color.fill.quaternary },
])

/* The zone fills its column, so the room under a short column's last row is its trailing slot, an empty one stands as tall as the row lifted over it, and one a row is carried into grows by that row, so its hidden foot moves down rather than under it. */
export const zone = style({
  flex: '1 1 auto',
  boxSizing: 'border-box',
  minHeight: 'var(--drag-floor, 0px)',
  paddingBottom: 'var(--drag-spill, 0px)',
})
