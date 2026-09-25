import { styleVariants } from '@vanilla-extract/css'
import { duration, easing } from './motion'

const parked = '(100% + var(--pane-inset) + var(--park-clearance))'

export const paneOverlay = styleVariants({
  right: { transform: `translateX(calc((1 - var(--io)) * ${parked}))` },
  left: { transform: `translateX(calc((1 - var(--io-l)) * -1 * ${parked}))` },
})

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
