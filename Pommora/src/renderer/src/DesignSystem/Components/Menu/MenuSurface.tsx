import type { ReactNode } from 'react'
import { cx } from '../../Util/cx'
import { dropdownMenu, dropdownMenuClosing } from '../../Animation/animations.css'
import { NotchedShell } from './NotchedShell'
import * as s from './menuSurface.css'

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
      animationClass={closing ? dropdownMenuClosing : dropdownMenu}
      notchInsetRight={notchInsetRight}
    >
      {children}
    </NotchedShell>
  )
}
