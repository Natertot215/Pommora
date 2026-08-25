// Kept in a PLAIN module (not a *.css.ts) so it can export functions: vanilla-extract serializes
// every export of a *.css.ts into a virtual CSS module and a function throws.

/** The tint ladder. Retuning a step here re-tints every surface that names it. */
export const TINT_STEPS = {
  primary: 60,
  secondary: 40,
  tertiary: 20,
  quaternary: 15,
  solid: 100,
} as const

export type TintStep = keyof typeof TINT_STEPS

/** The one mix primitive: `base` at `amount` over `into`. A named step routes through its var so the
 *  ladder stays live at runtime; a raw number is an amount no step names. */
export const mixAt = (
  base: string,
  amount: TintStep | number,
  into: string,
  space: 'srgb' | 'oklch' = 'srgb',
): string => {
  if (typeof amount === 'number' && amount >= 100) return base
  const at = typeof amount === 'number' ? `${amount}%` : `var(--tint-${amount})`
  return `color-mix(in ${space}, ${base} ${at}, ${into})`
}

export const tintAt = (base: string, amount: TintStep | number): string =>
  mixAt(base, amount, 'transparent')
