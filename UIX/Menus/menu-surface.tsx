import type { ReactNode } from 'react'
import { GlassSurface } from '../Glass/glass-surface'
import { cx } from '../Utilities/cx'
import { menuBloom, menuBloomClosing } from '../Animations/animations.css'
import * as s from './menu-surface.css'

export function MenuSurface({
  children,
  className,
  closing = false,
  notchInsetRight,
}: {
  children: ReactNode
  className?: string
  closing?: boolean
  notchInsetRight?: number
}): React.JSX.Element {
  return (
    <GlassSurface
      className={cx(s.surface, className)}
      notch={{
        insetRight: notchInsetRight,
        animationClass: closing ? menuBloomClosing : menuBloom,
      }}
    >
      {children}
    </GlassSurface>
  )
}
