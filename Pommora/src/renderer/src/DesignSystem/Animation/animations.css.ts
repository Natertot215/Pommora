import { globalKeyframes, style } from '@vanilla-extract/css'
import { duration } from './motion'

// The Bloom curve — Pommora-native, Apple-inspired. The one special-cased named curve (not a token).
const BLOOM = 'cubic-bezier(0.30, 0.75, 0, 1)'

// Navigation/Settings menus use the slower `slow`-token Bloom here; PickerMenu + AutocompletePanel use
// `dropdownOpen`/`dropdownClose` below (same keyframes, snappier `dropdown` token).
globalKeyframes('dropdown-menu', {
  from: { opacity: 0, transform: 'scale(0.5)' },
  to: { opacity: 1, transform: 'scale(1)' },
})

export const dropdownMenu = style({
  animation: `dropdown-menu ${duration.slow} ${BLOOM} both`,
  transformOrigin: 'var(--dropdown-origin, top center)',
})

// Retract — pane shrinks back toward its trigger so a dismiss withdraws rather than cuts.
globalKeyframes('dropdown-menu-out', {
  from: { opacity: 1, transform: 'scale(1)' },
  to: { opacity: 0, transform: 'scale(0.75)' },
})

export const dropdownMenuClosing = style({
  animation: `dropdown-menu-out ${duration.slow} ${BLOOM} both`,
  transformOrigin: 'var(--dropdown-origin, top center)',
})

// Same Bloom keyframes + curve as `dropdownMenu`, on the snappier symmetric `dropdown` token.
export const dropdownOpen = style({
  animation: `dropdown-menu ${duration.dropdown} ${BLOOM} both`,
  transformOrigin: 'var(--dropdown-origin, top center)',
})

export const dropdownClose = style({
  animation: `dropdown-menu-out ${duration.dropdown} ${BLOOM} both`,
  transformOrigin: 'var(--dropdown-origin, top center)',
})

// Title reveal — the ViewDropdown's labeled title sliding in/out as Show/Hide Title toggles.
export const titleReveal = `${duration.dropdown} ${BLOOM}`
