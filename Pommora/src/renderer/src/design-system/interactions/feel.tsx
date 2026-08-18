// The engine sorts via a CSS transition, so "smooth, not snappy" is just a duration + easing —
// also exposed to CSS (expand/caret) via vars.
export type Feel = { duration: number; easing: string }

const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)'

export const FEEL_PRESETS: Record<string, Feel> = {
  Glide: { duration: 340, easing: EASE_OUT },
  Smooth: { duration: 230, easing: EASE_OUT },
  Snappy: { duration: 130, easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)' },
}
export const DEFAULT_FEEL = FEEL_PRESETS.Smooth
