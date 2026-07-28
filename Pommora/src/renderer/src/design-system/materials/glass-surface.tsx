import type { HTMLAttributes, ReactNode } from 'react'
import { frostMaterial } from './glass-material'

/** Its own component (not a re-export of frostMaterial) so surface glass can diverge from
 *  window/control glass later. */
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
