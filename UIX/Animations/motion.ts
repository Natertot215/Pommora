export const duration = {
  fast: '180ms',
  menu: '225ms',
  base: '280ms',
  slow: '350ms',
} as const

export const easing = {
  baseEase: 'ease',
  baseSnap: 'cubic-bezier(0.22, 1, 0.36, 1)',
  bloom: 'cubic-bezier(0.30, 0.75, 0, 1)',
} as const

export const ms = (d: (typeof duration)[keyof typeof duration]): number => Number.parseInt(d, 10)

/** The JS form of `easing.baseEase` — a CSS timing function can't drive a canvas paint, so the curve is stated twice. Change them together. */
export const easeBase = (t: number): number => t * t * (3 - 2 * t)
