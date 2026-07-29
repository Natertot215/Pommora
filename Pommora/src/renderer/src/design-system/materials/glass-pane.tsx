import type { CSSProperties, HTMLAttributes, ReactNode, Ref } from 'react'
import { shadowStandardVar } from '../tokens/color.css'

/** Same recipe as the static frostMaterial (glass-material.ts) — a dimmed blur with a glassy
 *  edge — but with its own pane-tuned params (PANE_FROST). */
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
}

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

/** 0..1 → 2-digit hex alpha (colors authored as hex per the project rule). */
const hexA = (n: number): string =>
  Math.round(Math.max(0, Math.min(1, n)) * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase()

export function frostStyle(p: FrostParams): CSSProperties {
  const filter = `blur(${p.blur}px) brightness(${p.brightness}%)${p.saturate !== 100 ? ` saturate(${p.saturate}%)` : ''}`
  return {
    background: 'transparent',
    backdropFilter: filter,
    WebkitBackdropFilter: filter,
    border: `1px solid #FFFFFF${hexA(p.borderAlpha)}`,
    boxShadow: [
      `inset 0 1px 0 #FFFFFF${hexA(p.topSpecular)}`,
      `inset 0 0 0 1px #FFFFFF${hexA(p.innerRing)}`,
      `inset 0 -${p.depth}px ${p.rimBlur}px -${p.depth}px #FFFFFF${hexA(p.lowerRim)}`,
      shadowStandardVar,
    ].join(', '),
  }
}

export function GlassPane({
  children,
  style,
  ...rest
}: {
  children?: ReactNode
  ref?: Ref<HTMLDivElement>
} & HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div style={{ ...frostStyle(PANE_FROST), ...style }} {...rest}>
      {children}
    </div>
  )
}
