import { createVar, style, styleVariants } from '@vanilla-extract/css'
import { duration, easing } from './motion'

const parked = '(100% + var(--pane-inset) + var(--park-clearance))'

// The pane's own progress, uninherited: it animates on the same frames as the content clearing it, so the two move in lockstep, and restyles the pane alone.
const open = createVar({ syntax: '<number>', inherits: false, initialValue: '0' })
const slide = `${open.slice('var('.length, -1)} ${duration.base} ${easing.baseEase}`
export const paneOverlay = styleVariants({
  right: { transition: slide, transform: `translateX(calc((1 - ${open}) * ${parked}))` },
  left: { transition: slide, transform: `translateX(calc((${open} - 1) * ${parked}))` },
})
export const paneOverlayOpen = style({ vars: { [open]: '1' } })

const inflowTransition = `width ${duration.base} ${easing.baseEase}, opacity ${duration.base} ${easing.baseEase}`
export const paneInflow = styleVariants({
  open: { transition: inflowTransition, width: 'var(--pane-w)' },
  closed: {
    transition: inflowTransition,
    width: 0,
    opacity: 0,
    selectors: { '&&': { padding: 0 } },
  },
})
