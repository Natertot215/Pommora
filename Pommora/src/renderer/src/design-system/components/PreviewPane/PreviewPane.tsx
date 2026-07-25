import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react'
import { GlassPane } from '@renderer/design-system/materials'
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

/** The unified floating-chrome opening size every in-app window shares. */
export const PREVIEW_PANE_BOUNDS: FloatingBounds = { minW: 360, minH: 280, defW: 850, defH: 600 }

/** The shared inspector rail bounds — one remembered width across every window that hosts one. */
export const PREVIEW_PANE_INSPECTOR: SidePaneBounds = { min: 180, def: 260, max: 420 }

export interface PreviewPaneSide {
  /** Keys the persisted width — panes sharing an id share one remembered width. */
  windowId: string
  bounds: SidePaneBounds
  /**
   * `overlay` — slides over the body on its own driver; the body pads aside for it.
   * `inflow` — takes a column in the body row; closing collapses its width.
   */
  mode: 'overlay' | 'inflow'
  /** Overlay panes toggle. An in-flow pane collapses to nothing when false. */
  open?: boolean
  className?: string
  resizeLabel?: string
  children: ReactNode
}

export interface PreviewPaneTint {
  /** The window background beneath the frost. Defaults to the window-bg token. */
  color?: string
  /** 0–100. 0 = pure frost, 100 = opaque fill. */
  opacity?: number
}

/**
 * How the toolbar occupies the top of the window.
 * - `band` — a full-width strip that is itself a window-move surface, with the title slot
 *   between the two action clusters. Content scrolls beneath it.
 * - `floating` — no strip: the action clusters pin to the top corners and everything between
 *   them stays clickable, so a window whose own content reaches the top edge is not covered.
 */
export type PreviewPaneToolbar = 'band' | 'floating'

export interface PreviewPaneProps {
  /** Stable geometry id — windows sharing an id share one stashed size slot. */
  id: string
  closing: boolean
  onClose: () => void
  /** Escape override — defaults to `onClose` (e.g. close an inner pane first). */
  onEscape?: () => void
  bounds?: FloatingBounds
  /** Extra bare-background selectors a window-move may start from, appended to the pane's own. */
  dragSurfaces?: string
  ariaLabel: string
  className?: string
  style?: CSSProperties
  /** The root glass element. Hosts running a FLIP measure their rect from here. */
  rootRef?: Ref<HTMLDivElement>
  tint?: PreviewPaneTint
  toolbar?: PreviewPaneToolbar
  /** The leading toolbar glyph. Omitted = no scan button. */
  onScan?: () => void
  scanLabel?: string
  /** Toolbar centre — a title, a breadcrumb, a tab strip, or nothing. */
  title?: ReactNode
  /** Trailing buttons, left of the ×. They ride the swallow when a right overlay pane opens. */
  actions?: ReactNode
  left?: PreviewPaneSide
  right?: PreviewPaneSide
  children: ReactNode
}

export function PreviewPane({
  id,
  closing,
  onClose,
  onEscape,
  bounds = PREVIEW_PANE_BOUNDS,
  dragSurfaces,
  ariaLabel,
  className,
  style,
  rootRef,
  tint,
  toolbar = 'band',
  onScan,
  scanLabel = 'Open Full Page',
  title,
  actions,
  left,
  right,
  children,
}: PreviewPaneProps): React.JSX.Element {
  const surfaces = dragSurfaces ? `${DRAG_SURFACES}, ${dragSurfaces}` : DRAG_SURFACES
  const { style: winStyle, onWindowDown, startDrag } = useFloatingWindow(id, bounds, surfaces)

  // Widths mirror into vars the layout math reads (pane position, body squeeze, button swallow).
  // Seeded from the persisted slot so the first painted frame already carries a restored width.
  const [leftW, setLeftW] = useState(() =>
    left ? sidePaneWidth(left.windowId, left.bounds.def) : 0,
  )
  const [rightW, setRightW] = useState(() =>
    right ? sidePaneWidth(right.windowId, right.bounds.def) : 0,
  )
  const [resizing, setResizing] = useState(false)

  const leftOpen = left ? left.open !== false : false
  const rightOpen = right ? right.open !== false : false

  // Escape dismisses the LIVE window only — while the exit animation runs, or when a focused
  // surface already handled the press, this stays out of the way.
  const escape = useRef(onEscape ?? onClose)
  escape.current = onEscape ?? onClose
  useEffect(() => {
    if (closing) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !e.defaultPrevented) escape.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closing])

  const pane = (side: PreviewPaneSide, which: 'left' | 'right'): React.JSX.Element => (
    <SidePane
      windowId={side.windowId}
      side={which}
      bounds={side.bounds}
      open={which === 'left' ? leftOpen : rightOpen}
      className={cx(`ppane-side ppane-side-${which}-${side.mode}`, side.className)}
      resizeClassName={`ppane-side-resize ppane-side-${which}-${side.mode}-resize`}
      resizeLabel={side.resizeLabel}
      onWidthChange={which === 'left' ? setLeftW : setRightW}
      onResizingChange={setResizing}
    >
      {side.children}
    </SidePane>
  )

  // An in-flow pane shares a flex row with the content; an overlay pane is an absolutely
  // positioned sibling. The row only exists when something actually needs it, so a window with
  // no in-flow pane keeps its children as direct children of the window's column.
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
    <GlassPane
      ref={rootRef}
      className={cx(
        'ppane',
        `ppane-toolbar-${toolbar}`,
        className,
        leftOpen && 'is-side-left-open',
        rightOpen && 'is-side-right-open',
        resizing && 'is-resizing',
        closing && 'closing',
      )}
      // GlassPane's frost hard-sets a transparent background, so the tint composes here rather
      // than in the stylesheet — the vars stay readable for host CSS either way.
      style={
        {
          ...winStyle,
          '--ppane-bg': tint?.color ?? 'var(--bg-window)',
          '--ppane-bg-a': `${tint?.opacity ?? 85}%`,
          background: 'color-mix(in srgb, var(--ppane-bg) var(--ppane-bg-a), transparent)',
          ...(left && { '--ppane-side-l-w': `${leftW}px` }),
          ...(right && { '--ppane-side-r-w': `${rightW}px` }),
          ...style,
        } as CSSProperties
      }
      role="dialog"
      aria-label={ariaLabel}
      onPointerDown={onWindowDown}
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
      {left?.mode === 'overlay' && pane(left, 'left')}
      {right?.mode === 'overlay' && pane(right, 'right')}
      <FloatingResizeCorners startDrag={startDrag} />
    </GlassPane>
  )
}

// The bare backgrounds a window-move may start from. The title is pointer-inert, so a press on it
// lands on the toolbar beneath and arms the move.
const DRAG_SURFACES = '.ppane, .ppane-toolbar'
