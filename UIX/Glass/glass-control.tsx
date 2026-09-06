import type { HTMLAttributes, ReactNode } from 'react'
import { Glass, type GlassOptics } from '@samasante/liquid-glass'

/** Apple "Liquid Glass" via @samasante/liquid-glass — real edge refraction, not a flat frost.
 *  CONTROL_OPTICS is the tuned look; layout is the consumer's. GlassSegment is the small-control
 *  variant (the switch knob); menus use GlassSurface. */
export const CONTROL_OPTICS: Partial<GlassOptics> = {
  strength: 0.0,
  depth: 0.3,
  curvature: 0.45,
  bend: 0.0,
  bendWidth: 0.0,
  dispersion: 0.25,
  frost: 3.5,
  saturate: 1,
  brightness: -0.05,
  specular: 0.7,
  glow: 0,
  glowSpread: 0.3,
  glowFalloff: 1.5,
  sheen: 0.3,
  sheenWidth: 12,
  sheenFalloff: 1.5,
  sheenAngle: 90,
  splay: 0,
  mapSize: 255,
  clipToShape: true,
  softEdge: true,
  sheenDark: false,
}

export function GlassControls({
  children,
  style,
  ...rest
}: { children?: ReactNode } & HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  const r = style?.borderRadius
  return (
    <Glass
      optics={CONTROL_OPTICS}
      radius={typeof r === 'number' ? r : undefined}
      style={style}
      {...rest}
    >
      {children}
    </Glass>
  )
}

/** The same @samasante/liquid-glass material as GlassControls, tuned for small on-control segments
 *  (full brightness, zero depth) like the switch knob. */
const SEGMENT_OPTICS = { ...CONTROL_OPTICS, brightness: 0, depth: 0 }

export function GlassSegment({
  children,
  style,
  ...rest
}: { children?: ReactNode } & HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  const r = style?.borderRadius
  return (
    <Glass
      optics={SEGMENT_OPTICS}
      radius={typeof r === 'number' ? r : undefined}
      style={style}
      {...rest}
    >
      {children}
    </Glass>
  )
}
