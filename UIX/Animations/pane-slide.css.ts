import { style, styleVariants } from '@vanilla-extract/css'
import { duration } from './motion'

const parked = '(100% + var(--pane-inset) + var(--park-clearance))'
// The host's --pane-slide, which everything clearing the pane follows, so pane and content move on the same frames.
const slide = (property: string): string =>
  `${property} var(--pane-slide, ${duration.base}) var(--ease-base)`

export const paneOverlay = styleVariants({
  right: {
    transition: slide('--pane-open'),
    transform: `translateX(calc((1 - var(--pane-open)) * ${parked}))`,
  },
  left: {
    transition: slide('--pane-open'),
    transform: `translateX(calc((var(--pane-open) - 1) * ${parked}))`,
  },
})
export const paneOverlayOpen = style({ vars: { '--pane-open': '1' } })

const inflowTransition = `${slide('width')}, ${slide('opacity')}`
export const paneInflow = styleVariants({
  open: { transition: inflowTransition, width: 'var(--pane-w)' },
  closed: {
    transition: inflowTransition,
    width: 0,
    opacity: 0,
    selectors: { '&&': { padding: 0 } },
  },
})
