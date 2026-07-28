import type { HTMLAttributes, ReactNode } from 'react'
import { frostMaterial } from './glass-material'

/** The app's largest, backmost glass — the window frame the sidebar attaches to. Its own
 *  component (not a re-export of frostMaterial) so window glass can diverge from surface/control
 *  glass later. */
export function GlassWindow({
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
