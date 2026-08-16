import type { HTMLAttributes, ReactNode, Ref } from 'react'
import { frostStyle, WINDOW_FROST } from './glass-pane'

/** A floating window's glass — the pane's chrome carrying the shared body. What separates it from
 *  `GlassPane` is only that fill: a window has to hold its own content legible over whatever it
 *  floats above, where a menu is gone before that matters. `GlassSurface` is the tier below both,
 *  the app's fixed chrome, which sits a step brighter and stays clear. */
export function GlassWindow({
  children,
  style,
  ...rest
}: {
  children?: ReactNode
  ref?: Ref<HTMLDivElement>
} & HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div style={{ ...frostStyle(WINDOW_FROST), ...style }} {...rest}>
      {children}
    </div>
  )
}
