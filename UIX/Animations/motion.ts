import { clamp } from '../Utilities/clamp'

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

/** Evaluates a CSS `cubic-bezier` for a canvas paint or a scroll offset, where a timing function can't be handed to the browser. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const axis = (a: number, b: number, t: number): number =>
    ((1 - t) * 3 * ((1 - t) * a + t * b) + t * t) * t
  const slope = (a: number, b: number, t: number): number =>
    3 * (1 - t) * ((1 - t) * a + 2 * t * (b - a)) + 3 * t * t * (1 - b)
  return (x) => {
    let t = x
    for (let i = 0; i < 6; i++) {
      const d = slope(x1, x2, t)
      if (d === 0) break
      t -= (axis(x1, x2, t) - x) / d
    }
    return axis(y1, y2, clamp(t, 0, 1))
  }
}

/** The JS form of `easing.baseEase`, whose CSS keyword `ease` is this curve. Change them together. */
export const easeBase = cubicBezier(0.25, 0.1, 0.25, 1)
