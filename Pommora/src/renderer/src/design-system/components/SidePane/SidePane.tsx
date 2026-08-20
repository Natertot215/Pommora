import { useLayoutEffect, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { GlassSurface } from '@renderer/design-system/materials'
import { clamp } from '@renderer/design-system/clamp'
import { cx } from '@renderer/design-system/cx'
import './sidePane.css'

// Hosts own positioning (in-flow vs overlay), the width CSS var their layout math reads
// (mirrored via onWidthChange), and any slide (--io).

export interface SidePaneBounds {
  min: number
  def: number
  max: number
}

// Widths persist per window id across remounts, session-only — not written to disk.
const widths = new Map<string, number>()

/** Hosts seed their CSS-var state from this so the first frame already carries the restored
 *  width — the mirror effect runs post-mount. */
export const sidePaneWidth = (windowId: string, def: number): number => widths.get(windowId) ?? def

export function SidePane({
  windowId,
  side,
  bounds,
  open = true,
  className,
  resizeClassName,
  onWidthChange,
  onResizingChange,
  children,
}: {
  /** One persisted-width slot per hosting window. */
  windowId: string
  /** Which window edge the pane hugs; the resize strip drags the OPPOSITE edge. */
  side: 'left' | 'right'
  bounds: SidePaneBounds
  /** Overlay hosts toggle; in-flow hosts leave it true. */
  open?: boolean
  className?: string
  resizeClassName?: string
  onWidthChange?: (w: number) => void
  /** Transitions pause while dragging so the pane tracks 1:1 (the house resize rule). */
  onResizingChange?: (resizing: boolean) => void
  children?: React.ReactNode
}): React.JSX.Element {
  const [width, setWidth] = useState(() => sidePaneWidth(windowId, bounds.def))
  // Layout effect: the host's CSS var updates before paint, so a restored width never flashes.
  useLayoutEffect(() => {
    onWidthChange?.(width)
  }, [width, onWidthChange])

  const startResize = (e: ReactPointerEvent<HTMLElement>): void => {
    e.preventDefault()
    const el = e.currentTarget
    const pid = e.pointerId
    el.setPointerCapture(pid)
    const s = { x: e.clientX, w: widths.get(windowId) ?? width }
    onResizingChange?.(true)
    const move = (ev: PointerEvent): void => {
      const dx = ev.clientX - s.x
      const w = clamp(side === 'left' ? s.w + dx : s.w - dx, bounds.min, bounds.max)
      widths.set(windowId, w)
      setWidth(w)
    }
    const end = (): void => {
      if (el.hasPointerCapture(pid)) el.releasePointerCapture(pid)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', end)
      el.removeEventListener('pointercancel', end)
      onResizingChange?.(false)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', end)
    el.addEventListener('pointercancel', end)
  }

  return (
    <>
      <GlassSurface
        className={cx('sidepane', className)}
        style={{ background: 'var(--state-muted)' }}
        aria-hidden={!open}
      >
        {children}
      </GlassSurface>
      {open && (
        <div
          className={cx('sidepane-resize', resizeClassName)}
          onPointerDown={startResize}
          aria-hidden="true"
        />
      )}
    </>
  )
}
