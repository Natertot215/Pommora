import { useLayoutEffect, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { GlassPane } from '@renderer/DesignSystem/Glass'
import { paneSlide } from '@renderer/DesignSystem/Animation'
import { clamp } from '@shared/clamp'
import { cx } from '@renderer/DesignSystem/Util/cx'
import './window-panel.css'

// The panel owns its glass, resize strip, positioning class, and slide per side + mode; the host
// owns only the width CSS var its layout math reads, mirrored back through onWidthChange.

export interface WindowPanelBounds {
  min: number
  def: number
  max: number
}

// Widths persist per window id across remounts, session-only — not written to disk.
const widths = new Map<string, number>()

/** Hosts seed their CSS-var state from this so the first frame already carries the restored
 *  width — the mirror effect runs post-mount. */
export const windowPanelWidth = (windowId: string, def: number): number =>
  widths.get(windowId) ?? def

export function WindowPanel({
  windowId,
  side,
  mode,
  bounds,
  open = true,
  className,
  onWidthChange,
  onResizingChange,
  children,
}: {
  /** One persisted-width slot per hosting window. */
  windowId: string
  side: 'left' | 'right'
  mode: 'overlay' | 'inflow'
  bounds: WindowPanelBounds
  open?: boolean
  className?: string
  onWidthChange?: (w: number) => void
  /** Transitions pause while dragging so the panel tracks 1:1 (the house resize rule). */
  onResizingChange?: (resizing: boolean) => void
  children?: React.ReactNode
}): React.JSX.Element {
  const [width, setWidth] = useState(() => windowPanelWidth(windowId, bounds.def))
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
      <GlassPane
        className={cx(
          'window-panel',
          `window-panel-${side}-${mode}`,
          paneSlide({ side, mode, open }),
          className,
        )}
        style={{ background: 'var(--state-muted)' }}
        aria-hidden={!open}
      >
        {children}
      </GlassPane>
      {open && (
        <div
          className={cx('window-panel-resize', `window-panel-${side}-${mode}-resize`)}
          onPointerDown={startResize}
          aria-hidden="true"
        />
      )}
    </>
  )
}
