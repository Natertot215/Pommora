import { globalStyle, style } from '@vanilla-extract/css'
import { stack } from '../Theme/stack'
import { menuCompact, topBarTrailingLabel } from './menu-row.css'
import { viewport as frameViewport } from './frame-slide.css'

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

/** On a pane's surface a back bar's label keeps the row's trailing pad, which `MenuItem` drops for its trailing slot, so it sits as far in as the chevron opposite; a settings pane's stays flush with the controls beneath it. */
globalStyle(`${surface} ${topBarTrailingLabel}`, { marginRight: 'var(--row-pad-x)' })

/** A pane under a live resize tracks the pointer 1:1, so a frame's easing toward its content's size holds off. */
export const resizing = style({})
globalStyle(`${resizing} ${frameViewport}`, { transition: 'none' })
