import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react'
import { Button } from '@renderer/DesignSystem/Buttons'
import { GlassWindow } from '@renderer/DesignSystem/Glass'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { useRevealNear } from '@renderer/DesignSystem/Interactions/revealBar'
import {
  FloatingResizeCorners,
  useFloatingWindow,
  type FloatingBounds,
} from '@renderer/DesignSystem/Interactions/FloatingWindow'
import { WindowPanel, windowPanelWidth, type WindowPanelBounds } from './window-panel'
import './window-base.css'
import '@renderer/DesignSystem/Animation/toolbar-slide.css'

const BOUNDS: FloatingBounds = { minW: 360, minH: 280, defW: 850, defH: 600 }

export const WINDOW_BASE_PANEL: WindowPanelBounds = { min: 180, def: 260, max: 420 }

export interface WindowBasePanel {
  windowId: string
  bounds: WindowPanelBounds
  mode: 'overlay' | 'inflow'
  open?: boolean
  className?: string
  children: ReactNode
}

export interface WindowBaseProps {
  id: string
  closing: boolean
  onClose: () => void
  onEscape?: () => void
  bounds?: FloatingBounds
  dragSurfaces?: string
  ariaLabel: string
  className?: string
  style?: CSSProperties
  rootRef?: Ref<HTMLDivElement>
  onScan?: () => void
  scanLabel?: string
  lead?: ReactNode
  title?: ReactNode
  actions?: ReactNode
  left?: WindowBasePanel
  right?: WindowBasePanel
  footer?: ReactNode
  footerLabel?: (open: boolean) => string
  footerLead?: ReactNode
  children: ReactNode
}

const DRAG_SURFACES = '.window, .window-toolbar, .window-row'

export function WindowBase({
  id,
  closing,
  onClose,
  onEscape,
  bounds = BOUNDS,
  dragSurfaces,
  ariaLabel,
  className,
  style,
  rootRef,
  onScan,
  scanLabel = 'Open Full Page',
  lead,
  title,
  actions,
  left,
  right,
  footer,
  footerLabel,
  footerLead,
  children,
}: WindowBaseProps): React.JSX.Element {
  const surfaces = dragSurfaces ? `${DRAG_SURFACES}, ${dragSurfaces}` : DRAG_SURFACES
  const { style: winStyle, onWindowDown, startDrag } = useFloatingWindow(id, bounds, surfaces)

  // Seeded from the persisted slot so the first painted frame already carries the restored width.
  const [leftW, setLeftW] = useState(() =>
    left ? windowPanelWidth(left.windowId, left.bounds.def) : 0,
  )
  const [rightW, setRightW] = useState(() =>
    right ? windowPanelWidth(right.windowId, right.bounds.def) : 0,
  )
  const [resizing, setResizing] = useState(false)

  const leftOpen = left ? left.open !== false : false
  const rightOpen = right ? right.open !== false : false

  const hasFooter = footer !== undefined && footer !== null && footer !== false
  const [footerOpen, setFooterOpen] = useState(true)
  const reveal = useRevealNear()
  const remeasure = reveal.remeasure
  useEffect(() => {
    remeasure()
  }, [remeasure, winStyle, leftOpen, rightOpen, leftW, rightW])

  const dismiss = onEscape ?? onClose
  const escapeRef = useRef(dismiss)
  escapeRef.current = dismiss
  useEffect(() => {
    if (closing) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !e.defaultPrevented) escapeRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closing])

  const panel = (side: WindowBasePanel, which: 'left' | 'right'): React.JSX.Element => (
    <WindowPanel
      windowId={side.windowId}
      side={which}
      mode={side.mode}
      bounds={side.bounds}
      open={side.open !== false}
      className={side.className}
      onWidthChange={which === 'left' ? setLeftW : setRightW}
      onResizingChange={setResizing}
    >
      {side.children}
    </WindowPanel>
  )

  const inflow = left?.mode === 'inflow' || right?.mode === 'inflow'
  const body = inflow ? (
    <div className="window-row">
      {left?.mode === 'inflow' && panel(left, 'left')}
      {children}
      {right?.mode === 'inflow' && panel(right, 'right')}
    </div>
  ) : (
    children
  )

  return (
    <GlassWindow
      ref={rootRef}
      className={cx(
        'window',
        className,
        leftOpen && 'is-panel-left-open',
        rightOpen && 'is-panel-right-open',
        resizing && 'is-resizing',
        hasFooter && footerOpen && 'is-footer-open',
        hasFooter && reveal.near && 'is-footer-near',
        hasFooter && reveal.nearLead && 'is-footer-near-lead',
        closing && 'closing',
      )}
      style={
        {
          ...winStyle,
          ...(left && { '--window-panel-l-w': `${leftW}px` }),
          ...(right && { '--window-panel-r-w': `${rightW}px` }),
          ...style,
        } as CSSProperties
      }
      role="dialog"
      aria-label={ariaLabel}
      onPointerDown={onWindowDown}
      onMouseMove={hasFooter ? reveal.onMouseMove : undefined}
      onMouseLeave={hasFooter ? reveal.onMouseLeave : undefined}
    >
      <div className="window-toolbar">
        <div className="window-actions window-actions-lead">
          {onScan && (
            <Button
              size="button-inline"
              icon="scan"
              iconSize="body"
              title={scanLabel}
              onClick={onScan}
            />
          )}
          {lead}
        </div>
        {title}
        <div className="window-actions window-actions-trail">
          {actions && <div className="window-actions-flow">{actions}</div>}
          <Button size="button-inline" icon="x" iconSize="body" title="Close" onClick={onClose} />
        </div>
      </div>
      {body}
      {hasFooter && (
        <>
          <button
            type="button"
            className="window-footer-toggle"
            onClick={() => setFooterOpen((v) => !v)}
            aria-label={footerLabel?.(footerOpen)}
            title={footerLabel?.(footerOpen)}
          >
            <Icon name={footerOpen ? 'chevron-down' : 'chevron-up'} size="headline" />
          </button>
          {footerLead}
          <div className="window-footer">{footer}</div>
        </>
      )}
      {left?.mode === 'overlay' && panel(left, 'left')}
      {right?.mode === 'overlay' && panel(right, 'right')}
      <FloatingResizeCorners startDrag={startDrag} />
    </GlassWindow>
  )
}
