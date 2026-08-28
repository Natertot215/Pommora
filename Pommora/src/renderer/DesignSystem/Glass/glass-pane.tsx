import type { HTMLAttributes, ReactNode, Ref } from 'react'
import { paneMaterial } from './glass-base'

/** A Pane's glass — the sidebar, the inspector, a floating window's side slots, and the surfaces
 *  anchored in content. The clearest tier: the app's fixed chrome reads through it. */
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

/** The app's root glass — the one surface everything else floats over. */
export function Surface({ children }: { children: ReactNode }): React.JSX.Element {
  return <GlassPane className="surface-glass">{children}</GlassPane>
}
