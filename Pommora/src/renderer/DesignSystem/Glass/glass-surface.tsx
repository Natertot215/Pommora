import type { HTMLAttributes, ReactNode, Ref } from 'react'
import { frostStyle, SURFACE_FROST, WINDOW_FROST } from './glass-base'

/** The standard menu glass — clear, a step dimmer than a pane; a picker or a menu opening OVER
 *  another surface asks for `solid`. */
export function GlassSurface({
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
    <div style={{ ...frostStyle(solid ? WINDOW_FROST : SURFACE_FROST), ...style }} {...rest}>
      {children}
    </div>
  )
}
