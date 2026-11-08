import { style } from '@vanilla-extract/css'
import { duration, easing } from '../Animations/motion'

const RAIL_W = 12
const RAIL_X = `calc(var(--row-pad-standard) + ${RAIL_W / 2}px)`

export const chevron = style({
  transition: `transform var(--chevron-beat, ${duration.fast}) ${easing.baseEase}`,
  flex: '0 0 auto',
})
export const chevronOpen = style({ transform: 'rotate(90deg)' })

export const chevronSpacer = style({ width: `${RAIL_W}px`, flex: '0 0 auto' })

const RAIL_CLEARANCE = 6

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
