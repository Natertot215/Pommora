import type { CSSProperties } from 'react'
import { shadowLiftVar, shadowStandardVar } from '../Theme/color.css'
import { PURE_WHITE } from '../Theme/colors'
import { clamp } from '../Utilities/clamp'

/** The Pommora glass recipe — parametric, so each tier is one recipe at its own dim and fill. */
export interface FrostParams {
  blur: number
  brightness: number
  saturate: number
  borderAlpha: number
  topSpecular: number
  innerRing: number
  lowerRim: number
  depth: number
  rimBlur: number
  /** Translucent `--bg-window` fill, 0..1 — panes stay transparent. */
  fill?: number
  /** The drop shadow the stack ends in — standard for resting frost, lift for dragged chrome. */
  shadow?: string
}

/** KNOB — how much `--bg-window` sits behind the frost on anything that carries a body. ONE figure: a window and a picker opening over another pane want the same thing for the same reason, and two numbers required to match are two numbers that eventually don't.*/
export const SOLID_FILL = 0.9

export const SURFACE_FROST: FrostParams = {
  blur: 6,
  brightness: 90,
  saturate: 100,
  borderAlpha: 0.12,
  topSpecular: 0.35,
  innerRing: 0.08,
  lowerRim: 0.08,
  depth: 12,
  rimBlur: 18,
}

/** `GlassWindow`'s material, and what `GlassSurface` wears for `solid` — the pane's own chrome
 *  with only the fill added. */
export const WINDOW_FROST: FrostParams = { ...SURFACE_FROST, fill: SOLID_FILL }

/** The drag ghost — lighter than a resting surface, so the drop target reads through it. */
export const GHOST_FROST: FrostParams = {
  blur: 6,
  brightness: 100,
  saturate: 100,
  borderAlpha: 0,
  topSpecular: 0,
  innerRing: 0,
  lowerRim: 0,
  depth: 0,
  rimBlur: 0,
  fill: 0.75,
  shadow: shadowLiftVar,
}

const hexA = (n: number): string =>
  Math.round(clamp(n, 0, 1) * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase()

export function frostStyle(p: FrostParams): CSSProperties {
  const filter = `blur(${p.blur}px) brightness(${p.brightness}%)${p.saturate !== 100 ? ` saturate(${p.saturate}%)` : ''}`
  // Zero-valued edge pieces emit nothing, so an edge-free frost carries no phantom geometry.
  const edges = [
    p.borderAlpha > 0 && OUTLINE_INSET,
    p.topSpecular > 0 && `inset 0 1px 0 ${PURE_WHITE}${hexA(p.topSpecular)}`,
    p.innerRing > 0 && `inset 0 0 0 1px ${PURE_WHITE}${hexA(p.innerRing)}`,
    p.lowerRim > 0 &&
      `inset 0 -${p.depth}px ${p.rimBlur}px -${p.depth}px ${PURE_WHITE}${hexA(p.lowerRim)}`,
    p.shadow ?? shadowStandardVar,
  ].filter(Boolean)
  return {
    background:
      p.fill != null
        ? `color-mix(in srgb, var(--bg-window) ${Math.round(p.fill * 100)}%, transparent)`
        : 'transparent',
    backdropFilter: filter,
    WebkitBackdropFilter: filter,
    ...(p.borderAlpha > 0 && {
      border: `var(--width-100) solid var(--glass-outline, ${PURE_WHITE}${hexA(p.borderAlpha)})`,
    }),
    boxShadow: edges.join(', '),
  }
}

/** The outline's second pass, inward: widening the border would shift everything inside it. */
export const OUTLINE_INSET = 'inset 0 0 0 1px var(--glass-outline, transparent)'

/** The pane tier — the brightest glass in the app. */
export const paneMaterial: CSSProperties = frostStyle({ ...SURFACE_FROST, brightness: 95 })

// ── The beak — opt-in notched geometry any glass tier can wear (GlassSurface's `notch`) ──

/** KNOB — the beaked shell's corner radius. One writer: the clip path and SVG outline take it from
 *  here, and so does a notched surface whose scrolled body has to round to the same arc. */
export const BEAK_RADIUS = 12
/** The rise is the top inset a notched surface pads its content past, published as `--notch-h`. */
export const NOTCH_H = 8
const NOTCH_W = 34
const NOTCH_CURVE = 0.25

// One path serves as both the frost clip and the SVG outline — a rect border can't trace a beak.
function beakPath(w: number, h: number, nx: number): string {
  const r = BEAK_RADIUS
  const half = NOTCH_W / 2
  const xL = nx - half
  const xR = nx + half
  const cb = Math.min(half * (0.3 + NOTCH_CURVE), half)
  const ct = Math.min(half * (0.15 + NOTCH_CURVE), half * 0.9)
  return [
    `M ${r} ${NOTCH_H}`,
    `L ${xL} ${NOTCH_H}`,
    `C ${xL + cb} ${NOTCH_H} ${nx - ct} 0 ${nx} 0`,
    `C ${nx + ct} 0 ${xR - cb} ${NOTCH_H} ${xR} ${NOTCH_H}`,
    `L ${w - r} ${NOTCH_H}`,
    `Q ${w} ${NOTCH_H} ${w} ${NOTCH_H + r}`,
    `L ${w} ${h - r}`,
    `Q ${w} ${h} ${w - r} ${h}`,
    `L ${r} ${h}`,
    `Q 0 ${h} 0 ${h - r}`,
    `L 0 ${NOTCH_H + r}`,
    `Q 0 ${NOTCH_H} ${r} ${NOTCH_H}`,
    'Z',
  ].join(' ')
}

/** `insetRight` measures the beak's center from the right edge; omitted centers it. */
export function notchGeometry(
  w: number,
  h: number,
  insetRight?: number,
): { d: string; originX: number } {
  const nMin = BEAK_RADIUS + NOTCH_W / 2 + 2
  const nMax = w - BEAK_RADIUS - NOTCH_W / 2 - 2
  const nRaw = insetRight !== undefined ? w - insetRight : w / 2
  const pos = nMin < nMax ? clamp(nRaw, nMin, nMax) : w / 2
  return { d: beakPath(w, h, pos), originX: pos }
}
