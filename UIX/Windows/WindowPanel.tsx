import { useLayoutEffect } from 'react'
import { GlassPane } from '../Glass/GlassPane'
import { paneSlide } from '../Animations/paneSlide'
import { cx } from '../Utilities/cx'
import { useResizable } from '../Interactions/useResizable'
import type { NumberRange } from '../Utilities/clamp'

export type WindowPanelBounds = NumberRange & { default: number }

export function WindowPanel({
  side,
  mode,
  bounds,
  width,
  onWidth,
  open = true,
  className,
  onResizingChange,
  children,
}: {
  side: 'left' | 'right'
  mode: 'overlay' | 'inflow'
  bounds: WindowPanelBounds
  width: number
  onWidth: (w: number) => void
  open?: boolean
  className?: string
  /** Transitions pause while dragging so the panel tracks 1:1. */
  onResizingChange?: (resizing: boolean) => void
  children?: React.ReactNode
}): React.JSX.Element {
  const resize = useResizable({
    rect: { w: width },
    min: { w: bounds.min },
    max: { w: bounds.max },
    equilateral: true,
    onChange: (next) => onWidth(next.w),
  })
  const resizing = resize.active !== null
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
        aria-hidden={!open}
      >
        {children}
      </GlassPane>
      {open && (
        <div
          className={cx('resize-strip', `window-panel-${side}-${mode}-resize`)}
          onPointerDown={resize.start(side === 'left' ? 'e' : 'w')}
          aria-hidden="true"
        />
      )}
    </>
  )
}
