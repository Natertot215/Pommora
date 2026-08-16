import type { HTMLAttributes, ReactNode } from 'react'
import { frostMaterial } from './glass-material'

/** The app's fixed chrome — the sidebar, the inspector, a side rail. It sits a step BRIGHTER than
 *  the floating tiers and stays clear: it's the ground the app is built on rather than something
 *  hovering over it, so nothing needs to read through it. `GlassPane` floats above it, and
 *  `GlassWindow` is that pane carrying a body. */
export function GlassSurface({
  children,
  style,
  ...rest
}: { children?: ReactNode } & HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div style={{ ...frostMaterial, ...style }} {...rest}>
      {children}
    </div>
  )
}
