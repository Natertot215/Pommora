import { style } from '@vanilla-extract/css'
import { vars as colorVars } from '@pommora/uix/Theme/color.css'
import { frameZone } from '@pommora/uix/Menus/frames.css'

// KNOBS — the two columns
const PANE = { width: 200, gap: 8, radius: 8 }

export const columns = style({
  display: 'grid',
  gridTemplateColumns: `repeat(2, minmax(0, ${PANE.width}px))`,
  gap: `${PANE.gap}px`,
})

export const column = style({ display: 'flex', flexDirection: 'column', minWidth: 0 })

export const list = style([
  frameZone,
  { borderRadius: `${PANE.radius}px`, background: colorVars.color.fill.quaternary },
])

/* The zone fills its column, so the room under a short column's last row is its trailing slot, and an empty one stands as tall as the row lifted over it. */
export const zone = style({ flex: '1 1 auto', minHeight: 'var(--drag-floor, 0px)' })
