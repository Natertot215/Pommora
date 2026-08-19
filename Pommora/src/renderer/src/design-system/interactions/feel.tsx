import { easing } from '../tokens/motion'
// The engine sorts via a CSS transition, so a feel is just a duration + easing — also exposed
// to CSS (expand/caret) via vars.
export type Feel = { duration: number; easing: string }

export const DEFAULT_FEEL: Feel = { duration: 230, easing: easing.out }
/** The dashboard's slower, heavier tile motion. */
export const GLIDE_FEEL: Feel = { duration: 340, easing: easing.out }
