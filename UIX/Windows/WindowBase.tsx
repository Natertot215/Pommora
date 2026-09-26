import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react'
import { Button } from '../Buttons/Button'
import { GlassWindow } from '../Glass/GlassWindow'
import { FooterToggle } from '../Interactions/FooterToggle'
import { cx } from '../Utilities/cx'
import { useRevealNear } from '../Interactions/hoverReveal'
import { windowIn, windowOut } from '../Animations/animations.css'
import {
  ALL_EDGES,
  onScreen,
  useResizable,
  type Rect,
  type Size,
} from '../Interactions/useResizable'
import { useEscape, useWindowOrder } from '../Interactions/dismissalStack'
import { useFocusScope } from '../Interactions/focusScope'
import { RenderBoundary } from '../Elements/RenderBoundary'
import { WindowPanel, type WindowPanelBounds } from './WindowPanel'
import './window-base.css'
import '../Animations/toolbar-slide.css'

export interface WindowBounds {
  min: Size
  def: Size
}

const BOUNDS: WindowBounds = { min: { w: 360, h: 280 }, def: { w: 850, h: 600 } }

export const WINDOW_BASE_PANEL: WindowPanelBounds = { min: 180, def: 260, max: 420 }

// A remembered size may come from a larger display, so the opening rect is placed and then clamped to this viewport.
const opening = (
  size: Size | undefined,
  bounds: WindowBounds,
  region?: () => Rect | null,
): Rect => {
  const s = size ?? bounds.def
  const r = region?.()
  // A named region is centred on both axes; the bare viewport keeps its upper bias, where the whole screen is the window's to sit in.
  const box = r ?? { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight }
  const share = r ? 2 : 3
  return onScreen({
    ...s,
    x: Math.round(box.x + (box.w - s.w) / 2),
    y: Math.round(box.y + (box.h - s.h) / share),
  })
}

export interface WindowFooter {
  bar: ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  label: (open: boolean) => string
  lead?: ReactNode
}

export interface WindowBasePanel {
  windowId: string
  bounds: WindowPanelBounds
  mode: 'overlay' | 'inflow'
  open?: boolean
  className?: string
  children: ReactNode
}

// Session-only; never written to disk.
const panelWidths = new Map<string, number>()
const storedWidth = (side: WindowBasePanel | undefined): number =>
  side ? (panelWidths.get(side.windowId) ?? side.bounds.def) : 0

interface WindowBaseProps {
  closing: boolean
  onClose: () => void
  onEscape?: () => void
  bounds?: WindowBounds
  /** Absent opens at `bounds.def`. Read once, at open. */
  initialSize?: Size
  /** Only a resize reports: a move's size may be one clamped onto a smaller viewport at the open. */
  onSizeChange?: (size: Size) => void
  /** Read once, at open. Absent centres on the viewport with its upper bias. */
  region?: () => Rect | null
  /** A change brings the window to the front: a summon onto one already standing. */
  raiseOn?: unknown
  dragSurfaces?: string
  ariaLabel: string
  className?: string
  rootRef?: RefObject<HTMLDivElement | null>
  onScan?: () => void
  scanLabel?: string
  lead?: ReactNode
  title?: ReactNode
  actions?: ReactNode
  left?: WindowBasePanel
  right?: WindowBasePanel
  footer?: WindowFooter
  children: ReactNode
}

const DRAG_SURFACES =
  '.window, .window-drag, .window-row, .window-panel, .window-body, .window-tabwrap'

export function WindowBase({
  closing,
  onClose,
  onEscape,
  bounds = BOUNDS,
  initialSize,
  onSizeChange,
  region,
  raiseOn,
  dragSurfaces,
  ariaLabel,
  className,
  rootRef,
  onScan,
  scanLabel = 'Open Full Page',
  lead,
  title,
  actions,
  left,
  right,
  footer,
  children,
}: WindowBaseProps): React.JSX.Element {
  const surfaces = dragSurfaces ? `${DRAG_SURFACES}, ${dragSurfaces}` : DRAG_SURFACES
  const ownRef = useRef<HTMLDivElement>(null)
  const root = rootRef ?? ownRef
  const [geo, setGeo] = useState(() => opening(initialSize, bounds, region))
  const reveal = useRevealNear()
  useEffect(() => {
    const onResize = (): void => setGeo(onScreen)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const resize = useResizable({
    rect: geo,
    min: bounds.min,
    onChange: (next, phase, grip) => {
      setGeo(next)
      if (phase === 'drop' && grip !== 'move') onSizeChange?.({ w: next.w, h: next.h })
    },
  })
  // Window-move is reserved to the bare surfaces — anything else owns its pointer, so row/reorder captures aren't stolen mid-press.
  const onWindowDown = (e: React.PointerEvent<HTMLElement>): void => {
    if ((e.target as HTMLElement).matches(surfaces)) resize.start('move')(e)
  }

  const [leftW, setLeftW] = useState(() => storedWidth(left))
  const [rightW, setRightW] = useState(() => storedWidth(right))
  const [resizing, setResizing] = useState(false)

  const leftOpen = left ? left.open !== false : false
  const rightOpen = right ? right.open !== false : false

  const raise = useWindowOrder(root, !closing, raiseOn)
  useEscape(!closing, onEscape ?? onClose, () => root.current)
  useFocusScope(root, !closing, { initial: 'root' })

  const panel = (side: WindowBasePanel, which: 'left' | 'right'): React.JSX.Element => (
    <WindowPanel
      side={which}
      mode={side.mode}
      bounds={side.bounds}
      width={which === 'left' ? leftW : rightW}
      onWidth={(w) => {
        panelWidths.set(side.windowId, w)
        if (which === 'left') setLeftW(w)
        else setRightW(w)
      }}
      open={side.open !== false}
      className={side.className}
      onResizingChange={setResizing}
    >
      <RenderBoundary resetKey={side.children}>{side.children}</RenderBoundary>
    </WindowPanel>
  )

  const inflow = left?.mode === 'inflow' || right?.mode === 'inflow'
  // The bar belongs to the detail, not to the window: a panel runs the window's full height and the bar stops at its edge.
  const detail = (
    <RenderBoundary resetKey={children}>
      {footer ? (
        <div className="window-detail">
          {children}
          <div className="window-footer reveal-bar">{footer.bar}</div>
        </div>
      ) : (
        children
      )}
    </RenderBoundary>
  )
  const body = inflow ? (
    <div className="window-row">
      {left?.mode === 'inflow' && panel(left, 'left')}
      {detail}
      {right?.mode === 'inflow' && panel(right, 'right')}
    </div>
  ) : (
    detail
  )

  return (
    <GlassWindow
      ref={root}
      className={cx(
        'window',
        className,
        leftOpen && 'is-panel-left-open',
        rightOpen && 'is-panel-right-open',
        resizing && 'is-resizing',
        footer?.open && 'is-footer-open',
        footer && reveal.near && 'is-footer-near',
        footer && reveal.nearLead && 'is-footer-near-lead',
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
        } as CSSProperties
      }
      role="dialog"
      aria-label={ariaLabel}
      tabIndex={-1}
      onPointerDownCapture={raise}
      onFocusCapture={raise}
      onPointerDown={onWindowDown}
      onPointerMove={footer ? reveal.onPointerMove : undefined}
      onPointerLeave={footer ? reveal.onPointerLeave : undefined}
      onTransitionEnd={footer ? reveal.onTransitionEnd : undefined}
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
      {footer && (
        <>
          <FooterToggle
            className="window-footer-toggle"
            open={footer.open}
            onOpenChange={footer.onOpenChange}
            label={footer.label(footer.open)}
          />
          {footer.lead}
        </>
      )}
      {left?.mode === 'overlay' && panel(left, 'left')}
      {right?.mode === 'overlay' && panel(right, 'right')}
      {resize.edges(ALL_EDGES)}
    </GlassWindow>
  )
}
