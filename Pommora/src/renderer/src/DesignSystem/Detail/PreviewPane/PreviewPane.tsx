import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react'
import { GlassWindow } from '../../Materials'
import { Icon } from '../../Symbols'
import { cx } from '../../Util/cx'
import { useRevealNear } from '../../Interactions/revealBar'
import {
  FloatingResizeCorners,
  useFloatingWindow,
  type FloatingBounds,
} from '../../Interactions/FloatingWindow'
import { SidePane, sidePaneWidth, type SidePaneBounds } from '../SidePane/SidePane'
import './previewPane.css'

const BOUNDS: FloatingBounds = { minW: 360, minH: 280, defW: 850, defH: 600 }

/** The shared inspector rail bounds — one remembered width across every window that hosts one. */
export const PREVIEW_PANE_INSPECTOR: SidePaneBounds = { min: 180, def: 260, max: 420 }

export interface PreviewPaneSide {
  /** Panes sharing this id share one remembered width. */
  windowId: string
  bounds: SidePaneBounds
  /** `overlay` slides over the body on its own driver (body pads aside for it); `inflow` takes a
   *  column in the body row and collapses its width on close. */
  mode: 'overlay' | 'inflow'
  /** Overlay panes toggle. An in-flow pane collapses to nothing when false. */
  open?: boolean
  className?: string
  children: ReactNode
}

/**
 * `band` — a full-width strip that is itself a window-move surface; content scrolls beneath it.
 * `floating` — no strip: action clusters pin to the top corners and everything between stays
 * clickable, so content reaching the top edge isn't covered.
 */
export type PreviewPaneToolbar = 'band' | 'floating'

export interface PreviewPaneProps {
  /** Windows sharing this id share one stashed size slot. */
  id: string
  closing: boolean
  onClose: () => void
  onEscape?: () => void
  /** Opening size + resize floor. Override per-surface instead of editing the shared default. */
  bounds?: FloatingBounds
  dragSurfaces?: string
  ariaLabel: string
  className?: string
  style?: CSSProperties
  /** Hosts running a FLIP measure their rect from here. */
  rootRef?: Ref<HTMLDivElement>
  toolbar?: PreviewPaneToolbar
  onScan?: () => void
  scanLabel?: string
  /** The lead cluster's own controls, after the scan glyph when both are present. */
  lead?: ReactNode
  /** `band` mode only — a `floating` toolbar is zero-height and pointer-inert, so a title there
   *  is clipped away silently. */
  title?: ReactNode
  /** Rides the swallow when a right overlay pane opens. */
  actions?: ReactNode
  left?: PreviewPaneSide
  right?: PreviewPaneSide
  footer?: ReactNode
  footerLabel?: (open: boolean) => string
  /** A control riding the footer's reveal band, facing its collapse chevron across the bar. */
  footerLead?: ReactNode
  children: ReactNode
}

// The title is pointer-inert, so a press on it falls through to the toolbar and arms the move.
const DRAG_SURFACES = '.ppane, .ppane-toolbar, .ppane-row'

export function PreviewPane({
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
  toolbar = 'band',
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
}: PreviewPaneProps): React.JSX.Element {
  const surfaces = dragSurfaces ? `${DRAG_SURFACES}, ${dragSurfaces}` : DRAG_SURFACES
  const { style: winStyle, onWindowDown, startDrag } = useFloatingWindow(id, bounds, surfaces)

  // Seeded from the persisted slot so the first painted frame already carries the restored width.
  const [leftW, setLeftW] = useState(() =>
    left ? sidePaneWidth(left.windowId, left.bounds.def) : 0,
  )
  const [rightW, setRightW] = useState(() =>
    right ? sidePaneWidth(right.windowId, right.bounds.def) : 0,
  )
  const [resizing, setResizing] = useState(false)

  const leftOpen = left ? left.open !== false : false
  const rightOpen = right ? right.open !== false : false

  const hasFooter = footer !== undefined && footer !== null && footer !== false
  // Footer collapse is session-only — a floating surface never persists it.
  const [footerOpen, setFooterOpen] = useState(true)
  const reveal = useRevealNear()
  // Anything that can move or resize the pane drops the cached geometry so the next move re-measures.
  const remeasure = reveal.remeasure
  useEffect(() => {
    remeasure()
  }, [remeasure, winStyle, leftOpen, rightOpen, leftW, rightW])

  // Escape dismisses the LIVE window only — while the exit animation runs, or when a focused
  // surface already handled the press, this stays out of the way.
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

  const pane = (side: PreviewPaneSide, which: 'left' | 'right'): React.JSX.Element => (
    <SidePane
      windowId={side.windowId}
      side={which}
      bounds={side.bounds}
      open={side.open !== false}
      className={cx(`ppane-side ppane-side-${which}-${side.mode}`, side.className)}
      resizeClassName={`ppane-side-${which}-${side.mode}-resize`}
      onWidthChange={which === 'left' ? setLeftW : setRightW}
      onResizingChange={setResizing}
    >
      {side.children}
    </SidePane>
  )

  const inflow = left?.mode === 'inflow' || right?.mode === 'inflow'
  const body = inflow ? (
    <div className="ppane-row">
      {left?.mode === 'inflow' && pane(left, 'left')}
      {children}
      {right?.mode === 'inflow' && pane(right, 'right')}
    </div>
  ) : (
    children
  )

  return (
    <GlassWindow
      ref={rootRef}
      className={cx(
        'ppane',
        `ppane-toolbar-${toolbar}`,
        className,
        leftOpen && 'is-side-left-open',
        rightOpen && 'is-side-right-open',
        resizing && 'is-resizing',
        hasFooter && footerOpen && 'is-footer-open',
        hasFooter && reveal.near && 'is-footer-near',
        hasFooter && reveal.nearLead && 'is-footer-near-lead',
        closing && 'closing',
      )}
      style={
        {
          ...winStyle,
          ...(left && { '--ppane-side-l-w': `${leftW}px` }),
          ...(right && { '--ppane-side-r-w': `${rightW}px` }),
          ...style,
        } as CSSProperties
      }
      role="dialog"
      aria-label={ariaLabel}
      onPointerDown={onWindowDown}
      onMouseMove={hasFooter ? reveal.onMouseMove : undefined}
      onMouseLeave={hasFooter ? reveal.onMouseLeave : undefined}
    >
      <div className="ppane-toolbar">
        <div className="ppane-actions ppane-actions-lead">
          {onScan && (
            <button type="button" className="ppane-action" title={scanLabel} onClick={onScan}>
              <Icon name="scan" size="body" />
            </button>
          )}
          {lead}
        </div>
        {/* Rendered bare, not wrapped: a tab strip contributes its own flex child (and an
            absolutely-positioned title beside it), which a wrapper would collapse into one box. */}
        {title}
        <div className="ppane-actions ppane-actions-trail">
          {actions && <div className="ppane-actions-flow">{actions}</div>}
          <button type="button" className="ppane-action" title="Close" onClick={onClose}>
            <Icon name="x" size="body" />
          </button>
        </div>
      </div>
      {body}
      {hasFooter && (
        <>
          <button
            type="button"
            className="ppane-footer-toggle"
            onClick={() => setFooterOpen((v) => !v)}
            aria-label={footerLabel?.(footerOpen)}
            title={footerLabel?.(footerOpen)}
          >
            <Icon name={footerOpen ? 'chevron-down' : 'chevron-up'} size="title3" />
          </button>
          {footerLead}
          <div className="ppane-footer">{footer}</div>
        </>
      )}
      {left?.mode === 'overlay' && pane(left, 'left')}
      {right?.mode === 'overlay' && pane(right, 'right')}
      <FloatingResizeCorners startDrag={startDrag} />
    </GlassWindow>
  )
}
