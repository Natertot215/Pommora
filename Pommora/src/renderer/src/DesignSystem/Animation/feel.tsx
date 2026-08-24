import { duration, easing, ms } from './motion'

export type Feel = { duration: number; easing: string }

export const DEFAULT_FEEL: Feel = { duration: ms(duration.dropdown), easing: easing.baseSnap }
export const GLIDE_FEEL: Feel = { duration: ms(duration.slow), easing: easing.baseSnap }
