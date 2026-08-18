// The engine sorts via a CSS transition, so a feel is just a duration + easing — also exposed
// to CSS (expand/caret) via vars.
export type Feel = { duration: number; easing: string }

const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)'

export const DEFAULT_FEEL: Feel = { duration: 230, easing: EASE_OUT }
/** The dashboard's slower, heavier tile motion. */
export const GLIDE_FEEL: Feel = { duration: 340, easing: EASE_OUT }
