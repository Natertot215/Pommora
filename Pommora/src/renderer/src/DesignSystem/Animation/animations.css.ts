import { globalKeyframes, style } from '@vanilla-extract/css'
import { duration } from './motion'

// The Bloom curve — Pommora-native, Apple-inspired. The one special-cased named curve (not a token).
const BLOOM = 'cubic-bezier(0.30, 0.75, 0, 1)'

// Navigation/Settings menus use the slower `slow`-token Bloom here; PickerMenu + AutocompletePane use
// `bloomOpen`/`bloomClose` below (same keyframes, snappier `menu` token).
globalKeyframes('menu-bloom', {
  from: { opacity: 0, transform: 'scale(0.5)' },
  to: { opacity: 1, transform: 'scale(1)' },
})

export const menuBloom = style({
  animation: `menu-bloom ${duration.slow} ${BLOOM} both`,
  transformOrigin: 'var(--menu-origin, top center)',
})

// Retract — pane shrinks back toward its trigger so a dismiss withdraws rather than cuts.
globalKeyframes('menu-bloom-out', {
  from: { opacity: 1, transform: 'scale(1)' },
  to: { opacity: 0, transform: 'scale(0.75)' },
})

export const menuBloomClosing = style({
  animation: `menu-bloom-out ${duration.slow} ${BLOOM} both`,
  transformOrigin: 'var(--menu-origin, top center)',
})

// Same Bloom keyframes + curve as `menuBloom`, on the snappier symmetric `menu` token.
export const bloomOpen = style({
  animation: `menu-bloom ${duration.menu} ${BLOOM} both`,
  transformOrigin: 'var(--menu-origin, top center)',
})

export const bloomClose = style({
  animation: `menu-bloom-out ${duration.menu} ${BLOOM} both`,
  transformOrigin: 'var(--menu-origin, top center)',
})

// Title reveal — the ViewMenu's labeled title sliding in/out as Show/Hide Title toggles.
export const titleReveal = `${duration.menu} ${BLOOM}`
