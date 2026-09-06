import type { HTMLAttributes, ReactNode, Ref } from 'react'
import { frostStyle, WINDOW_FROST } from './glass-base'

/** Only the fill separates it from `GlassSurface`: a window has to hold its content legible over whatever it floats above. */
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
