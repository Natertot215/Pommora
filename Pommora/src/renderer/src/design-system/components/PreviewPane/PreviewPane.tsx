import { useEffect, useRef, type CSSProperties, type ReactNode, type Ref } from 'react'
import { GlassPane } from '@renderer/design-system/materials'
import { Icon } from '@renderer/design-system/symbols'
import { cx } from '@renderer/design-system/cx'
import {
  FloatingResizeCorners,
  useFloatingWindow,
  type FloatingBounds,
} from '@renderer/design-system/interactions/FloatingWindow'
import './previewPane.css'

/** The unified floating-chrome opening size every in-app window shares. */
export const PREVIEW_PANE_BOUNDS: FloatingBounds = { minW: 360, minH: 280, defW: 850, defH: 600 }

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
  children,
}: PreviewPaneProps): React.JSX.Element {
  const surfaces = dragSurfaces ? `${DRAG_SURFACES}, ${dragSurfaces}` : DRAG_SURFACES
  const { style: winStyle, onWindowDown, startDrag } = useFloatingWindow(id, bounds, surfaces)

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

  return (
    <GlassPane
      ref={rootRef}
      className={cx('ppane', `ppane-toolbar-${toolbar}`, className, closing && 'closing')}
      // GlassPane's frost hard-sets a transparent background, so the tint composes here rather
      // than in the stylesheet — the vars stay readable for host CSS either way.
      style={
        {
          ...winStyle,
          '--ppane-bg': tint?.color ?? 'var(--bg-window)',
          '--ppane-bg-a': `${tint?.opacity ?? 85}%`,
          background: 'color-mix(in srgb, var(--ppane-bg) var(--ppane-bg-a), transparent)',
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
      {children}
      <FloatingResizeCorners startDrag={startDrag} />
    </GlassPane>
  )
}

// The bare backgrounds a window-move may start from. The title is pointer-inert, so a press on it
// lands on the toolbar beneath and arms the move.
const DRAG_SURFACES = '.ppane, .ppane-toolbar'
