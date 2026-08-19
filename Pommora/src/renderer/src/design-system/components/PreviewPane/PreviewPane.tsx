import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from 'react'
import { GlassWindow } from '@renderer/design-system/materials'
import { Icon } from '@renderer/design-system/symbols'
import { cx } from '@renderer/design-system/cx'
import {
  FloatingResizeCorners,
  useFloatingWindow,
  type FloatingBounds,
} from '@renderer/design-system/interactions/FloatingWindow'
import {
  SidePane,
  sidePaneWidth,
  type SidePaneBounds,
} from '@renderer/design-system/components/SidePane/SidePane'
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
  /** `band` mode only — a `floating` toolbar is zero-height and pointer-inert, so a title there
   *  is clipped away silently. */
  title?: ReactNode
  /** Rides the swallow when a right overlay pane opens. */
  actions?: ReactNode
  left?: PreviewPaneSide
  right?: PreviewPaneSide
  footer?: ReactNode
  children: ReactNode
}

// Footer-chevron reveal hit-zone, from the pane's own corner.
const NEAR_W = 260
const NEAR_H = 120

const sideDelta = (open: boolean, was: boolean, width: number): number =>
  open === was ? 0 : open ? width : -width

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
  title,
  actions,
  left,
  right,
  footer,
  children,
}: PreviewPaneProps): React.JSX.Element {
  const surfaces = dragSurfaces ? `${DRAG_SURFACES}, ${dragSurfaces}` : DRAG_SURFACES
  const {
    style: winStyle,
    onWindowDown,
    startDrag,
    widenBy,
  } = useFloatingWindow(id, bounds, surfaces)

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

  // A side opening widens the window by that pane's width, so the body keeps the width it had
  // and a second pane never squeezes the first one's neighbor. Width DRAGS are deliberately not
  // reflected: dragging a pane's own strip reallocates inside the window, which is what the grip
  // means. Only an open/close transition moves the window's own edge.
  const sidesOpen = useRef({ left: leftOpen, right: rightOpen })
  useLayoutEffect(() => {
    const was = sidesOpen.current
    if (was.left === leftOpen && was.right === rightOpen) return
    const delta = sideDelta(leftOpen, was.left, leftW) + sideDelta(rightOpen, was.right, rightW)
    sidesOpen.current = { left: leftOpen, right: rightOpen }
    if (delta) widenBy(delta)
  }, [leftOpen, rightOpen, leftW, rightW, widenBy])

  const hasFooter = footer !== undefined && footer !== null && footer !== false
  // Footer collapse is session-only — a floating surface never persists it.
  const [footerOpen, setFooterOpen] = useState(true)
  const [footerNear, setFooterNear] = useState(false)
  // Measured lazily and cached: getBoundingClientRect per mousemove forces a layout every pointer
  // move. Anything that can move/resize the pane drops the cache so the next move re-measures.
  const paneRect = useRef<DOMRect | null>(null)
  useEffect(() => {
    paneRect.current = null
  }, [winStyle, leftOpen, rightOpen, leftW, rightW])

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
      resizeClassName={`ppane-side-resize ppane-side-${which}-${side.mode}-resize`}
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
        hasFooter && footerNear && 'is-footer-near',
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
      onMouseMove={
        hasFooter
          ? (e) => {
              paneRect.current ??= e.currentTarget.getBoundingClientRect()
              const r = paneRect.current
              setFooterNear(e.clientX > r.right - NEAR_W && e.clientY > r.bottom - NEAR_H)
            }
          : undefined
      }
      onMouseLeave={
        hasFooter
          ? () => {
              paneRect.current = null
              setFooterNear(false)
            }
          : undefined
      }
    >
      <div className="ppane-toolbar">
        <div className="ppane-actions ppane-actions-lead">
          {onScan && (
            <button type="button" className="ppane-action" title={scanLabel} onClick={onScan}>
              <Icon name="scan" size={13} />
            </button>
          )}
        </div>
        {/* Rendered bare, not wrapped: a tab strip contributes its own flex child (and an
            absolutely-positioned title beside it), which a wrapper would collapse into one box. */}
        {title}
        <div className="ppane-actions ppane-actions-trail">
          {actions && <div className="ppane-actions-flow">{actions}</div>}
          <button type="button" className="ppane-action" title="Close" onClick={onClose}>
            <Icon name="x" size={14} />
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
            aria-label={footerOpen ? 'Hide footer' : 'Show footer'}
            title={footerOpen ? 'Hide footer' : 'Show footer'}
          >
            <Icon name={footerOpen ? 'chevron-down' : 'chevron-up'} size="md" />
          </button>
          <div className="ppane-footer">{footer}</div>
        </>
      )}
      {left?.mode === 'overlay' && pane(left, 'left')}
      {right?.mode === 'overlay' && pane(right, 'right')}
      <FloatingResizeCorners startDrag={startDrag} />
    </GlassWindow>
  )
}
