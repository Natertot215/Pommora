import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { cx } from '../Util/cx'
import { GHOST_FROST, frostStyle } from '../Materials/glass-pane'
import { text } from '../Tokens/typography.css'

/** Portaled to body so it paints ABOVE any pane frost — without it, a drag's only visual is the
 *  source row dimmed in place, which melts into the glass and reads as "dragging behind the pane." */
export function DragGhost({
  x,
  y,
  label,
}: {
  x: number | null
  y: number | null
  label: ReactNode
}): ReactNode {
  if (x === null || y === null || label == null || label === '') return null
  return createPortal(
    <div
      aria-hidden
      className={cx('drag-ghost', text.body.standard)}
      style={{ ...frostStyle(GHOST_FROST), top: y, left: x }}
    >
      {label}
    </div>,
    document.body,
  )
}
