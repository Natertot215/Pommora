import { useEffect, type CSSProperties } from 'react'
import { GlassPane } from '@renderer/design-system/materials'
import { Icon } from '@renderer/design-system/symbols'
import { cx } from '@renderer/design-system/cx'
import {
  FloatingResizeCorners,
  useFloatingWindow,
  type FloatingBounds,
} from '@renderer/design-system/interactions/FloatingWindow'
import * as s from './floatingPane.css'

/**
 * The floating-window chassis every in-app window shares: GlassPane + the per-id
 * floating geometry (drag from bare surfaces, corner resize) + the dismissal contract
 * (Escape, a lone non-focus-stealing `×` top-right) + exit presence. Consumers own the
 * whole interior through `children` — side rails included — so a window's layout CSS
 * never fights the shell.
 */
export interface FloatingPaneShellProps {
  /** Stable geometry id — windows sharing an id share one stashed geometry slot. */
  id: string
  closing: boolean
  onClose: () => void
  /** Escape behavior override — defaults to `onClose` (e.g. close an inner pane first). */
  onEscape?: () => void
  bounds: FloatingBounds
  /** The bare-background selectors a window-move may start from; default = the glass itself. */
  dragSurfaces?: string
  className?: string
  style?: CSSProperties
  ariaLabel: string
  /** Replaces the default `×` styling wholesale (a consumer with its own window CSS). */
  closeClassName?: string
  children: React.ReactNode
}

/** The chassis without presence — for consumers whose body state feeds `onEscape`. */
export function FloatingPaneShell({
  id,
  closing,
  onClose,
  onEscape,
  bounds,
  dragSurfaces,
  className,
  style,
  ariaLabel,
  closeClassName,
  children,
}: FloatingPaneShellProps): React.JSX.Element {
  const {
    style: winStyle,
    onWindowDown,
    startDrag,
  } = useFloatingWindow(id, bounds, dragSurfaces ?? '.floating-pane')

  // Escape dismisses the LIVE window only — while the exit animation runs (or a focused
  // surface already handled the press) the handler stays out of the way.
  useEffect(() => {
    if (closing) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      ;(onEscape ?? onClose)()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closing, onEscape, onClose])

  return (
    <GlassPane
      className={cx(
        'floating-pane',
        s.pane,
        className,
        closing && 'closing',
        closing && s.paneClosing,
      )}
      style={{ ...winStyle, ...style }}
      role="dialog"
      aria-label={ariaLabel}
      onPointerDown={onWindowDown}
    >
      <button
        type="button"
        className={closeClassName ?? s.close}
        aria-label="Close"
        onClick={onClose}
      >
        <Icon name="x" size={14} />
      </button>
      {children}
      <FloatingResizeCorners startDrag={startDrag} />
    </GlassPane>
  )
}
