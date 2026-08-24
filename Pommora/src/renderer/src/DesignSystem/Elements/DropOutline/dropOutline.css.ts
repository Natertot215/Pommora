import { style } from '@vanilla-extract/css'

export const ROW_PAD_X = 6
export const RAIL_W = 12
export const RAIL_CENTER_X = ROW_PAD_X + RAIL_W / 2

export const dropOutline = style({
  transition: 'transform var(--drop-outline-beat, var(--duration-fast)) var(--ease-base)',
  flex: '0 0 auto',
})
export const dropOutlineOpen = style({ transform: 'rotate(90deg)' })

export const dropOutlineSpacer = style({ width: `${RAIL_W}px`, flex: '0 0 auto' })

const RAIL_CLEARANCE = 6
const RAIL_X = `var(--disclosure-rail-x, ${RAIL_CENTER_X}px)` // KNOB

export const railRow = style({
  position: 'relative',
  paddingLeft: `calc(${RAIL_X} + ${RAIL_CLEARANCE}px)`,
  '::before': {
    content: '""',
    position: 'absolute',
    top: 'var(--list-outline-gap)',
    bottom: 'var(--list-outline-gap)',
    left: `calc(${RAIL_X} - var(--list-outline-width) / 2)`,
    width: 'var(--list-outline-width)',
    borderRadius: 'var(--list-outline-radius)',
    background: 'var(--list-outline-color)',
  },
})
