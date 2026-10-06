import { globalStyle, style } from '@vanilla-extract/css'
import { stack } from '../Theme/stack'
import { fieldRing, ROW_RING } from '../Fields/fieldRing'
import { menuCompact } from '../Menus/menu-row.css'
import { viewport as frameViewport } from '../Menus/frame-slide.css'

/** KNOB — a picker's height ceiling; below MENU_MAX_HEIGHT because a picker hangs off a control rather than filling a pane. */
export const PICKER_MAX_HEIGHT = 240

export const treePane = style({
  minWidth: 140, // KNOB
  maxWidth: 260, // KNOB
})

export const optionRing = style({
  vars: { '--field-ring': 'var(--accent-stroke-hot)' },
  boxShadow: fieldRing(ROW_RING),
})

export const layer = style({ position: 'fixed', zIndex: stack.top.menu })

export const shield = style({ position: 'fixed', inset: 0, zIndex: stack.top.menu })

/** KNOB — the pane's corner radius; a plain rounded rect, no beak, so its gutter is even on all four sides. */
export const PANE_RADIUS = 12

export const pane = style([
  menuCompact,
  {
    position: 'relative',
    zIndex: 0,
    borderRadius: `${PANE_RADIUS}px`,
  },
])

export const surface = style({
  padding: '4px',
  display: 'flex',
  flexDirection: 'column',
  gap: '0px',
})

/** A pane under a live resize tracks the pointer 1:1, so a frame's easing toward its content's size holds off. */
export const resizing = style({})
globalStyle(`${resizing} ${frameViewport}`, { transition: 'none' })
