// Kept in a PLAIN module (not a *.css.ts) so it can export functions: vanilla-extract serializes
// every export of a *.css.ts into a virtual CSS module and a function throws.
import { vars as colorVars } from './color.css'

const labelPrimary = colorVars.color.label.primary

/** Opacity steps applied to a base color (the Figma "Tint" model: a tint is an opacity, not a
 *  baked color) — a component picks a step, the base color comes from the call site. */
export const TINT_STEPS = {
  primary: 60,
  secondary: 40,
  tertiary: 20,
  quaternary: 15,
  solid: 100,
} as const

export type TintStep = keyof typeof TINT_STEPS

export const tintAt = (base: string, step: number): string =>
  step >= 100 ? base : `color-mix(in srgb, ${base} ${step}%, transparent)`

/** `label-primary` washed with a tint-quaternary amount of the base, so chip text reads as the
 *  label color rather than the assigned color. */
export const tint = (base: string): { background: string; borderColor: string; color: string } => ({
  background: tintAt(base, TINT_STEPS.primary),
  borderColor: tintAt(base, TINT_STEPS.secondary),
  color: `color-mix(in srgb, ${base} ${TINT_STEPS.quaternary}%, ${labelPrimary})`,
})
