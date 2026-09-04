import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react'
import { Button } from '@renderer/DesignSystem/Buttons'
import { GlassWindow } from '@renderer/DesignSystem/Glass'
import { Icon } from '@renderer/DesignSystem/Symbols'
import { cx } from '@renderer/DesignSystem/Util/cx'
import { useRevealNear } from '@renderer/Interactions/revealBar'
import { windowIn, windowOut } from '@renderer/Animation'
import {
  CORNERS,
  onScreen,
  useResizeFrame,
  type Rect,
  type Size,
} from '@renderer/Interactions/ResizeFrame'
import { WindowPanel, windowPanelWidth, type WindowPanelBounds } from './window-panel'
import './window-base.css'
import '@renderer/Animation/toolbar-slide.css'

export interface WindowBounds {
  min: Size
  def: Size
}

const BOUNDS: WindowBounds = { min: { w: 360, h: 280 }, def: { w: 850, h: 600 } }

export const WINDOW_BASE_PANEL: WindowPanelBounds = { min: 180, def: 260, max: 420 }

// A window's size outlives its exit-presence unmount, per window id; it reopens centered.
const sizes = new Map<string, Size>()
const opening = (id: string, bounds: WindowBounds): Rect => {
  const s = sizes.get(id) ?? bounds.def
  return onScreen({
    ...s,
    x: Math.round((window.innerWidth - s.w) / 2),
    y: Math.round((window.innerHeight - s.h) / 3),
  })
}

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
  bounds?: WindowBounds
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

const DRAG_SURFACES = '.window, .window-drag, .window-row, .window-panel'

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
  const [geo, setGeo] = useState(() => opening(id, bounds))
  useEffect(() => {
    const onResize = (): void => setGeo(onScreen)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const frame = useResizeFrame({
    rect: geo,
    min: bounds.min,
    onChange: (next) => {
      sizes.set(id, { w: next.w, h: next.h })
      setGeo(next)
    },
  })
  // Window-move is reserved to the bare surfaces (the allow-list) — anything else owns its
  // pointer, so row/reorder captures are never stolen mid-press.
  const onWindowDown = (e: React.PointerEvent<HTMLElement>): void => {
    if ((e.target as HTMLElement).matches(surfaces)) frame.start('move')(e)
  }

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
  }, [remeasure, geo, leftOpen, rightOpen, leftW, rightW])

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
        closing ? windowOut : windowIn,
        closing && 'closing',
      )}
      style={
        {
          left: geo.x,
          top: geo.y,
          width: geo.w,
          height: geo.h,
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
      <div className="window-drag" aria-hidden="true" />
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
      {frame.edges(CORNERS)}
    </GlassWindow>
  )
}
