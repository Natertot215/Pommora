import { useLayoutEffect, useState } from 'react'
import { GlassPane } from '@renderer/DesignSystem/Glass'
import { paneSlide } from '@renderer/Animation'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { useResizeFrame } from '@renderer/Interactions/ResizeFrame'
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

  const frame = useResizeFrame({
    rect: { w: width },
    min: { w: bounds.min },
    max: { w: bounds.max },
    equilateral: true,
    onChange: (next) => {
      widths.set(windowId, next.w)
      setWidth(next.w)
    },
  })
  const resizing = frame.active !== null
  useLayoutEffect(() => {
    onResizingChange?.(resizing)
  }, [resizing, onResizingChange])

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
          className={cx('resize-strip', `window-panel-${side}-${mode}-resize`)}
          onPointerDown={frame.start(side === 'left' ? 'e' : 'w')}
          aria-hidden="true"
        />
      )}
    </>
  )
}
