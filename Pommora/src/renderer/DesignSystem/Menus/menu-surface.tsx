import type { ReactNode } from 'react'
import { GlassSurface } from '../Glass'
import { cx } from '../Util/cx'
import { menuBloom, menuBloomClosing } from '../Animation/animations.css'
import * as s from './menu-surface.css'

/** A menu's glass — the beaked surface tier, its notch pointing up at the trigger that opened it. */
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
