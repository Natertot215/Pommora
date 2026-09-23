import { globalKeyframes, keyframes, style } from '@vanilla-extract/css'
import { duration, easing } from './motion'

globalKeyframes('menu-bloom', {
  from: { opacity: 0, transform: 'scale(0.5)' },
  to: { opacity: 1, transform: 'scale(1)' },
})

globalKeyframes('menu-bloom-out', {
  from: { opacity: 1, transform: 'scale(1)' },
  to: { opacity: 0, transform: 'scale(0.75)' },
})

const bloom = (d: (typeof duration)[keyof typeof duration]) => ({
  open: style({
    animation: `menu-bloom ${d} ${easing.bloom} both`,
    transformOrigin: 'var(--menu-origin, top center)',
  }),
  close: style({
    animation: `menu-bloom-out ${d} ${easing.bloom} both`,
    transformOrigin: 'var(--menu-origin, top center)',
  }),
})

export const menuBloom = bloom(duration.slow)
export const pickerBloom = bloom(duration.menu)

export const titleReveal = `${duration.menu} ${easing.bloom}`

const windowInFrames = keyframes({ from: { opacity: 0, transform: 'scale(0.95)' } })
const windowOutFrames = keyframes({ to: { opacity: 0, transform: 'scale(0.85)' } })

export const windowIn = style({
  animation: `${windowInFrames} ${duration.fast} ${easing.baseEase}`,
})

export const windowOut = style({
  animation: `${windowOutFrames} ${duration.fast} ${easing.baseEase} forwards`,
  pointerEvents: 'none',
})

const TITLE_ACTION_FADE = 'opacity var(--duration-base) var(--ease-base)'

export const titleActionFade = style({ transition: `${TITLE_ACTION_FADE}, visibility 0s` })

export const titleActionFadeHidden = style({
  opacity: 0,
  visibility: 'hidden',
  transition: `${TITLE_ACTION_FADE}, visibility 0s var(--duration-base)`,
})
