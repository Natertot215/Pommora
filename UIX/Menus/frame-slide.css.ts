import { style } from '@vanilla-extract/css'
import { duration, easing } from '../Animations/motion'

export const viewport = style({ position: 'relative', overflow: 'hidden' })

/** Width only: height must track measured content instantly or it lag-chases an in-place growth. */
export const viewportAnimated = style({
  transition: `width ${duration.base} ${easing.baseEase}`,
})

/** Defined after `viewportAnimated` so, applied together, its width+height transition wins the tie. */
export const viewportNav = style({
  transition: `width ${duration.base} ${easing.baseEase}, height ${duration.base} ${easing.baseEase}`,
})

/** Top-aligned so each slot keeps its own height, not the taller one's. */
export const track = style({ display: 'flex', alignItems: 'flex-start' })
export const trackAnimated = style({ transition: `transform ${duration.base} ${easing.baseEase}` })

export const slot = style({ flex: '0 0 auto', display: 'flex', flexDirection: 'column' })

/** Hidden, not unmounted, so the slot keeps the box the size observer reads; only while settled, or the outgoing slot would vanish instead of leaving. */
export const slotIdle = style({ visibility: 'hidden' })

/** The measured box the ResizeObserver watches, so the min floors ride it and never the slot. */
export const slotContent = style({ flex: '0 0 auto', display: 'flex', flexDirection: 'column' })
