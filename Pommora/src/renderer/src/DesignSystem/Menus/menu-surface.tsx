import type { ReactNode } from 'react'
import { cx } from '../Util/cx'
import { menuBloom, menuBloomClosing } from '../Animation/animations.css'
import { NotchedShell } from './menu-shell'
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
    <NotchedShell
      className={cx(s.surface, className)}
      animationClass={closing ? menuBloomClosing : menuBloom}
      notchInsetRight={notchInsetRight}
    >
      {children}
    </NotchedShell>
  )
}
