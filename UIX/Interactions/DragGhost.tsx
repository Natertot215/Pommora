import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { cx } from '../Utilities/cx'
import { GHOST_FROST, frostStyle } from '../Glass/glass-base'
import { text } from '../Theme/typography.css'

/** Portaled to body so it paints above any pane frost; inside one it reads as dragging behind the pane. */
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
