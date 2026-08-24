import type { HTMLAttributes, ReactNode } from 'react'
import { Glass } from '@samasante/liquid-glass'
import { CONTROL_OPTICS } from './glass-controls'

/** The SAME @samasante/liquid-glass material as GlassControls — real edge refraction, not a CSS
 *  frost — tuned for small on-control segments (full brightness, zero depth) like the switch knob. */
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
