import { globalKeyframes, keyframes, style } from '@vanilla-extract/css'
import { duration, easing } from './motion'

// The Bloom curve — the one special-cased named curve, not a token.
const BLOOM = 'cubic-bezier(0.30, 0.75, 0, 1)'

globalKeyframes('menu-bloom', {
  from: { opacity: 0, transform: 'scale(0.5)' },
  to: { opacity: 1, transform: 'scale(1)' },
})

export const menuBloom = style({
  animation: `menu-bloom ${duration.slow} ${BLOOM} both`,
  transformOrigin: 'var(--menu-origin, top center)',
})

globalKeyframes('menu-bloom-out', {
  from: { opacity: 1, transform: 'scale(1)' },
  to: { opacity: 0, transform: 'scale(0.75)' },
})

export const menuBloomClosing = style({
  animation: `menu-bloom-out ${duration.slow} ${BLOOM} both`,
  transformOrigin: 'var(--menu-origin, top center)',
})

export const bloomOpen = style({
  animation: `menu-bloom ${duration.menu} ${BLOOM} both`,
  transformOrigin: 'var(--menu-origin, top center)',
})

export const bloomClose = style({
  animation: `menu-bloom-out ${duration.menu} ${BLOOM} both`,
  transformOrigin: 'var(--menu-origin, top center)',
})

export const titleReveal = `${duration.menu} ${BLOOM}`

const windowInFrames = keyframes({ from: { opacity: 0, transform: 'scale(0.95)' } })
const windowOutFrames = keyframes({ to: { opacity: 0, transform: 'scale(0.85)' } })

export const windowIn = style({
  animation: `${windowInFrames} ${duration.fast} ${easing.baseEase}`,
})

export const windowOut = style({
  animation: `${windowOutFrames} ${duration.fast} ${easing.baseEase} forwards`,
  pointerEvents: 'none',
})
