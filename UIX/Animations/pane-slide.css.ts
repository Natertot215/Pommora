import { styleVariants } from '@vanilla-extract/css'

const parked = '(100% + var(--pane-inset) + var(--park-clearance))'

export const paneOverlay = styleVariants({
  right: { transform: `translateX(calc((1 - var(--io)) * ${parked}))` },
  left: { transform: `translateX(calc((1 - var(--io-l)) * -1 * ${parked}))` },
})

const inflowTransition =
  'width var(--duration-base) var(--ease-base), opacity var(--duration-base) var(--ease-base)'
export const paneInflow = styleVariants({
  open: { transition: inflowTransition, width: 'var(--pane-w)' },
  closed: {
    transition: inflowTransition,
    width: 0,
    opacity: 0,
    selectors: { '&&': { padding: 0 } },
  },
})
