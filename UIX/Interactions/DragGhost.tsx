import type { ReactNode } from 'react'
import { GHOST_FROST, frostStyle } from '../Glass/glassBase'
import { text } from '../Theme/typography.css'
import { cx } from '../Utilities/cx'

export function DragGhost({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <div
      aria-hidden
      className={cx('drag-ghost', text.body.standard)}
      style={frostStyle(GHOST_FROST)}
    >
      {children}
    </div>
  )
}
