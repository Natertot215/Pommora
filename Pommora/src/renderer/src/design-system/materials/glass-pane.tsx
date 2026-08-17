import type { CSSProperties, HTMLAttributes, ReactNode, Ref } from 'react'
import { shadowLiftVar, shadowStandardVar } from '../tokens/color.css'
import { OUTLINE_INSET, OUTLINE_TRANSITION } from './glass-material'

/** The static frostMaterial's recipe (glass-material.ts) — a dimmed blur with a glassy edge — made
 *  parametric so a pane can be tuned live. PANE_FROST is that recipe at a slightly deeper dim; every
 *  other value it carries is the material's own. */
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

export const PANE_FROST: FrostParams = {
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

/** The pane recipe carrying the shared body — `GlassWindow`'s material, and what `GlassPane` wears
 *  when a caller asks for `solid`. The chrome is the pane's own; only the fill is added. */
export const WINDOW_FROST: FrostParams = { ...PANE_FROST, fill: SOLID_FILL }

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
    // Only where there is an edge to double.
    p.borderAlpha > 0 && OUTLINE_INSET,
    p.topSpecular > 0 && `inset 0 1px 0 #FFFFFF${hexA(p.topSpecular)}`,
    p.innerRing > 0 && `inset 0 0 0 1px #FFFFFF${hexA(p.innerRing)}`,
    p.lowerRim > 0 && `inset 0 -${p.depth}px ${p.rimBlur}px -${p.depth}px #FFFFFF${hexA(p.lowerRim)}`,
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
      border: `1px solid var(--glass-outline, #FFFFFF${hexA(p.borderAlpha)})`,
      transition: OUTLINE_TRANSITION,
    }),
    boxShadow: edges.join(', '),
  }
}

export function GlassPane({
  children,
  style,
  solid = false,
  ...rest
}: {
  children?: ReactNode
  ref?: Ref<HTMLDivElement>
  /** Add the shared body — for a pane that opens OVER another pane, where clear glass on clear glass
   *  leaves the rows underneath reading through. Adds the fill only; the chrome is already the
   *  pane's. */
  solid?: boolean
} & HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div style={{ ...frostStyle(solid ? WINDOW_FROST : PANE_FROST), ...style }} {...rest}>
      {children}
    </div>
  )
}
