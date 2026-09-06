import type { HTMLAttributes, ReactNode, Ref } from 'react'
import { paneMaterial } from './glass-base'

/** A Pane's glass — the clearest tier: the app's fixed chrome reads through it. */
export function GlassPane({
  children,
  style,
  ...rest
}: {
  children?: ReactNode
  ref?: Ref<HTMLDivElement>
} & HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div style={{ ...paneMaterial, ...style }} {...rest}>
      {children}
    </div>
  )
}
