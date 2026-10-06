import type { ReactNode } from 'react'
import { GHOST_FROST, frostStyle } from '../Glass/glassBase'
import { text } from '../Theme/typography.css'
import { cx } from '../Utilities/cx'

/** A `bare` ghost carries a chip that is its own surface, so it travels without the frosted pill. */
export function DragGhost({
  bare = false,
  children,
}: {
  bare?: boolean
  children: ReactNode
}): React.JSX.Element {
  return (
    <div
      aria-hidden
      className={cx('drag-ghost', bare && 'is-bare', text.body.standard)}
      style={bare ? undefined : frostStyle(GHOST_FROST)}
    >
      {children}
    </div>
  )
}
