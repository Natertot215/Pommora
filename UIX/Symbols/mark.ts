// A centered-hexagonal lattice of 19 dots — one core, six at A, six at √3·A, six at 2·A.

const SHELLS = [
  { d: 0, tier: 0, from: 0 },
  { d: 1, tier: 1, from: 90 },
  { d: Math.sqrt(3), tier: 2, from: 0 },
  { d: 2, tier: 2, from: 90 },
] as const

const WEIGHT = [2.5, 2.0, 1.0] as const

/** The logo carries the ring; the icon takes that band into the disc, so both share one footprint. */
export type MarkVariant = 'logo' | 'icon'

export const MARK_BOX = 24
export const RING_OPACITY = 0.8

// KNOBS — `a` is lattice spacing in viewBox units, `dot` the disc radius per tier in units of `a`,
// and `ring` the multiplier turning the 2.5 / 2.0 / 1.0 weight ratio into viewBox units.
const MARK = { a: 5.4, dot: [0.282, 0.218, 0.171], ring: 0.022 }

const DOTS = SHELLS.flatMap(({ d, tier, from }) =>
  (d === 0 ? [0] : [0, 60, 120, 180, 240, 300]).map((step) => {
    const rad = ((from + step) * Math.PI) / 180
    return {
      cx: MARK_BOX / 2 + d * MARK.a * Math.cos(rad),
      cy: MARK_BOX / 2 - d * MARK.a * Math.sin(rad),
      r: MARK.dot[tier] * MARK.a,
      w: WEIGHT[tier] * MARK.ring * MARK.a,
    }
  }),
)

export const markDiscs = (variant: MarkVariant): { cx: number; cy: number; r: number }[] =>
  DOTS.map(({ cx, cy, r, w }) => ({ cx, cy, r: variant === 'icon' ? r + w : r }))

// Centred half a stroke outside the logo's disc, so the ring's outer edge lands on the icon's radius.
export const markRings = (): { cx: number; cy: number; r: number; w: number }[] =>
  DOTS.map(({ cx, cy, r, w }) => ({ cx, cy, r: r + w / 2, w }))
