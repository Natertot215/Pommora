export const duration = {
  fast: '180ms',
  menu: '225ms',
  base: '280ms',
  slow: '350ms',
} as const

export const easing = {
  baseEase: 'ease',
  baseSnap: 'cubic-bezier(0.22, 1, 0.36, 1)',
  /** The Bloom — the curve every menu and picker opens and closes on. */
  bloom: 'cubic-bezier(0.30, 0.75, 0, 1)',
} as const

export const ms = (d: (typeof duration)[keyof typeof duration]): number => Number.parseInt(d, 10)
