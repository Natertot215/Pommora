// Kept in a PLAIN module (not a *.css.ts) so it can export functions: vanilla-extract serializes
// every export of a *.css.ts into a virtual CSS module and a function throws.
import { vars as colorVars } from './color.css'

const labelPrimary = colorVars.color.label.primary

export const TINT_STEPS = {
  primary: 60,
  secondary: 40,
  tertiary: 20,
  quaternary: 15,
  solid: 100,
} as const

export type TintStep = keyof typeof TINT_STEPS

/** The one mix primitive every derived color goes through: `base` at `pct` over `into`. A
 *  full-strength mix IS the base, so it short-circuits rather than emitting a no-op color-mix. */
export const mixAt = (
  base: string,
  pct: number,
  into: string,
  space: 'srgb' | 'oklch' = 'srgb',
): string => (pct >= 100 ? base : `color-mix(in ${space}, ${base} ${pct}%, ${into})`)

export const tintAt = (base: string, step: number): string => mixAt(base, step, 'transparent')

/** `label-primary` washed with a tint-quaternary amount of the base, so chip text reads as the
 *  label color rather than the assigned color. */
export const tint = (base: string): { background: string; borderColor: string; color: string } => ({
  background: tintAt(base, TINT_STEPS.primary),
  borderColor: tintAt(base, TINT_STEPS.secondary),
  color: mixAt(base, TINT_STEPS.quaternary, labelPrimary),
})
