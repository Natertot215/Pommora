import { useLayoutEffect, useState } from 'react'
import { GlassPane } from '../Glass/glass-pane'
import { paneSlide } from '../Animations/paneSlide'
import { cx } from '../Utilities/cx'
import { useResizeFrame } from '../Interactions/ResizeFrame'

export interface WindowPanelBounds {
  min: number
  def: number
  max: number
}

// Session-only; never written to disk.
const widths = new Map<string, number>()

/** Seeds a host's CSS var before mount; the mirror effect only runs after it. */
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
  windowId: string
  side: 'left' | 'right'
  mode: 'overlay' | 'inflow'
  bounds: WindowPanelBounds
  open?: boolean
  className?: string
  onWidthChange?: (w: number) => void
  /** Transitions pause while dragging so the panel tracks 1:1. */
  onResizingChange?: (resizing: boolean) => void
  children?: React.ReactNode
}): React.JSX.Element {
  const [width, setWidth] = useState(() => windowPanelWidth(windowId, bounds.def))
  // Before paint, so a restored width never flashes.
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
