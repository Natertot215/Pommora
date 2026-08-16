import type { ReactNode } from 'react'
import { cx } from '../../cx'
import { dropdownMenu, dropdownMenuClosing } from '../../animations.css'
import { NotchedPane } from '../NotchedPane'
import * as s from './menuSurface.css'

export function MenuSurface({
  children,
  className,
  closing = false,
  notchInsetRight,
}: {
  children: ReactNode
  className?: string
  /** The parent keeps it mounted until the retract animation ends — this component doesn't self-unmount. */
  closing?: boolean
  notchInsetRight?: number
}): React.JSX.Element {
  return (
    <NotchedPane
      className={cx(s.surface, className)}
      animationClass={closing ? dropdownMenuClosing : dropdownMenu}
      notchInsetRight={notchInsetRight}
    >
      {children}
    </NotchedPane>
  )
}
