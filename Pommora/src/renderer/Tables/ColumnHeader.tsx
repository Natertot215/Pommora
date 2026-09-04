import { cx } from '@renderer/DesignSystem/Util/cx'
import { usePointerGesture } from '@renderer/Interactions/gesture'
import type { ColumnAlign } from '@shared/views'

/** One column header: the whole cell is the grab surface for the smooth-shift reorder (`dragging`
 *  applies the ghost veil + solid band, `transform` slides it with the cursor) plus a right-edge resize
 *  strip. The strip stops propagation so a resize never starts a reorder; the resize pointer delta
 *  is divided by the live zoom so a screen drag maps onto the grid's pre-zoom track width. */
export function ColumnHeader({
  id,
  label,
  icon,
  width,
  align,
  transform,
  dragging,
  onDragStart,
  onResize,
  onResizeStart,
  onResizeAbort,
  onResizeEnd,
  onResizeCommit,
  onContextMenu,
}: {
  id: string
  label: string
  icon: React.ReactNode
  width: number
  align: ColumnAlign
  transform: string | undefined
  dragging: boolean
  onDragStart: (e: React.PointerEvent) => void
  onResize: (id: string, width: number) => number
  onResizeStart: (id: string) => void
  onResizeAbort: () => void
  onResizeEnd: () => void
  onResizeCommit: (id: string, width: number) => void
  onContextMenu?: (e: React.MouseEvent) => void
}): React.JSX.Element {
  const beginGesture = usePointerGesture()
  // On the skeleton like its GFM sibling: cancel reverts instead of committing, and a zero-move
  // click ends through teardown alone.
  const startResize = (e: React.PointerEvent<HTMLSpanElement>): void => {
    e.preventDefault()
    e.stopPropagation()
    const grip = e.currentTarget
    const cell = grip.closest('.col-header')
    const zoom = (cell && cell.getBoundingClientRect().width / width) || 1
    const startX = e.clientX
    let last = width
    beginGesture({
      el: grip,
      event: e,
      activation: 0,
      onActivate: () => {
        onResizeStart(id)
        return true
      },
      onDragMove: (ev) => {
        last = onResize(id, width + (ev.clientX - startX) / zoom)
      },
      onDrop: () => onResizeCommit(id, last),
      onAbort: onResizeAbort,
      teardown: onResizeEnd,
    })
  }
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a right-click affordance on a container, not a control — the contents carry their own semantics
    <div
      className={cx('col-header', dragging && 'col-dragging')}
      style={{ transform, textAlign: align }}
      onPointerDown={onDragStart}
      onContextMenu={onContextMenu}
    >
      {icon}
      {label}
      <span className="col-resizer" onPointerDown={startResize} />
    </div>
  )
}
