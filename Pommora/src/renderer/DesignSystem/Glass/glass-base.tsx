import type { CSSProperties } from 'react'
import { shadowLiftVar, shadowStandardVar } from '../Tokens/color.css'

/** The Pommora glass recipe — a clear, slightly-dimmed blur with a glassy edge: a crisp top specular,
 *  a hairline inner ring, and soft light pooling at the lower rim — made parametric so each tier is
 *  the same recipe at its own dim and fill. Layout (size / position / radius) is the consumer's. */
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
  /** Translucent `--bg-window` fill, 0..1 — panes stay transparent; a drag chip needs body
   *  to hold legible over arbitrary content. */
  fill?: number
  /** The drop shadow the stack ends in — standard for resting frost, lift for dragged chrome. */
  shadow?: string
}

/** KNOB — how much `--bg-window` sits behind the frost on anything that carries a body. ONE figure:
 *  a window and a picker opening over another pane want the same thing for the same reason, and two
 *  numbers required to match are two numbers that eventually don't. Short of 1 on purpose — an
 *  opaque pane still computes its backdrop blur, paying for a frost nothing can see through. */
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

/** The surface recipe carrying the shared body — `GlassWindow`'s material, and what `GlassSurface` wears
 *  when a caller asks for `solid`. The chrome is the pane's own; only the fill is added. */
export const WINDOW_FROST: FrostParams = { ...SURFACE_FROST, fill: SOLID_FILL }

/** The drag ghost's glass — filled and edge-free, so the chip stays legible mid-flight and
 *  reads as lifted rather than framed. Its own fill: a chip in flight stays lighter than a resting
 *  surface so the drop target reads through it. */
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
  fill: 0.78,
  shadow: shadowLiftVar,
}

/** 0..1 → 2-digit hex alpha (colors authored as hex per the project rule). */
const hexA = (n: number): string =>
  Math.round(Math.max(0, Math.min(1, n)) * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase()

export function frostStyle(p: FrostParams): CSSProperties {
  const filter = `blur(${p.blur}px) brightness(${p.brightness}%)${p.saturate !== 100 ? ` saturate(${p.saturate}%)` : ''}`
  // Zero-valued edge pieces emit nothing — an edge-free frost (the ghost) carries no phantom
  // border geometry or invisible inset layers.
  const edges = [
    p.borderAlpha > 0 && OUTLINE_INSET,
    p.topSpecular > 0 && `inset 0 1px 0 #FFFFFF${hexA(p.topSpecular)}`,
    p.innerRing > 0 && `inset 0 0 0 1px #FFFFFF${hexA(p.innerRing)}`,
    p.lowerRim > 0 &&
      `inset 0 -${p.depth}px ${p.rimBlur}px -${p.depth}px #FFFFFF${hexA(p.lowerRim)}`,
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
      border: `var(--width-100) solid var(--glass-outline, #FFFFFF${hexA(p.borderAlpha)})`,
    }),
    boxShadow: edges.join(', '),
  }
}

/** The outline's second pass, inward — a tinted edge on a 1px border reads far fainter than the same
 *  color on the thicker borders tiles and embeds wear, and widening the border would shift
 *  everything inside it, so the weight goes where nothing can move. */
export const OUTLINE_INSET = 'inset 0 0 0 1px var(--glass-outline, transparent)'

/** The pane tier — the chrome panes' clear 5%-dim frost, the brightest glass in the app. */
export const paneMaterial: CSSProperties = {
  background: 'transparent',
  backdropFilter: 'blur(6px) brightness(95%)',
  WebkitBackdropFilter: 'blur(6px) brightness(95%)',
  border: 'var(--width-100) solid var(--glass-outline, #FFFFFF1F)',
  boxShadow: [
    OUTLINE_INSET,
    'inset 0 1px 0 #FFFFFF59', // top specular — the glassy edge highlight
    'inset 0 0 0 1px #FFFFFF14', // hairline inner ring
    'inset 0 -12px 18px -12px #FFFFFF14', // soft light pooling at the lower rim
    shadowStandardVar, // drop shadow — the shared --shadow-base token
  ].join(', '),
}
