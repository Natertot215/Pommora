import type { HTMLAttributes } from 'react'
import { Glass, type GlassOptics } from '@samasante/liquid-glass'

/** Apple "Liquid Glass" — real edge refraction, not a flat frost; layout is the consumer's. */
const CONTROL_OPTICS: Partial<GlassOptics> = {
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

/** Tuned for the small glass knob of the switch and slider. */
const KNOB_OPTICS = { ...CONTROL_OPTICS, brightness: 0, depth: 0 }

export function GlassControl({
  knob,
  style,
  ...rest
}: { knob?: boolean } & HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  const r = style?.borderRadius
  return (
    <Glass
      optics={knob ? KNOB_OPTICS : CONTROL_OPTICS}
      radius={typeof r === 'number' ? r : undefined}
      style={style}
      {...rest}
    />
  )
}
