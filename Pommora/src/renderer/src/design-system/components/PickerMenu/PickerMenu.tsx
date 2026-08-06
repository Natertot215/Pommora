import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { dropdownOpen, dropdownClose } from '../../animations.css'
import { useExitPresence } from '../../useExitPresence'
import { NotchedPane } from '../NotchedPane'
import { MenuScrollFrame } from '../menu/Menu'
import { cx } from '../../cx'
import { DROPDOWN_GAP as GAP } from '../dropdownAnchor'
import * as s from './pickerMenu.css'

const VIEWPORT_MARGIN = 8

// React events cross portals: an un-stopped pointerdown here bubbles to a trigger's drag-handle
// ancestor and pointer-capture steals the click. Stopping it here covers every consumer.
const stopPointerBubble = (e: { stopPropagation: () => void }): void => e.stopPropagation()
// Right-clicks over an open picker die here: portal contextmenu bubbles the COMPONENT tree into the
// owner's native-menu handlers, popping a mis-targeted menu over the still-open picker.
const stopContextBubble = (e: {
  stopPropagation: () => void
  preventDefault: () => void
}): void => {
  e.stopPropagation()
  e.preventDefault()
}

// `[tabindex="-1"]` is excluded on purpose: a programmatic-only target (the pane shell itself) is
// reachable by script but is never a tab stop.
const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
const tabStops = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))

// Uses the `dropdown` motion token (shared with AutocompletePanel). Self-managed (pass `open` +
// `onDismiss`) owns its own mount/unmount and portals to a fixed top layer, escaping any clipping
// ancestor; its backdrop also covers the trigger so a toggle can't dismiss-then-reopen. Manual
// (pass `closing`, mount it yourself) is for bespoke close logic. Both layers carry
// `data-picker-portal` because useDismiss's containment check can't see through the portal.
export type PickerDirection = 'down' | 'up' | 'left' | 'right'

export function PickerMenu({
  children,
  open,
  onDismiss,
  triggerRef,
  closing: closingProp = false,
  solid = false,
  radius = 14,
  notchWidth = 28,
  notchHeight = 8,
  notchCurve = 0.225,
  direction = 'down',
  origin = 'right',
  anchorX,
  maxHeight,
  width,
  bareSurface = false,
  manageFocus = true,
  contentClassName,
  style,
  onDirection,
}: {
  children: ReactNode
  open?: boolean
  onDismiss?: () => void
  triggerRef?: RefObject<Element | null>
  closing?: boolean
  solid?: boolean
  radius?: number
  notchWidth?: number
  notchHeight?: number
  notchCurve?: number
  direction?: PickerDirection
  origin?: 'right' | 'center' | 'left'
  anchorX?: number
  maxHeight?: number
  /** Pair with `origin="left"`: without this, widening content near a viewport edge still drags
   *  every row sideways via the position clamp. */
  width?: number
  bareSurface?: boolean
  manageFocus?: boolean
  contentClassName?: string
  style?: CSSProperties
  /** Reports the effective (post-flip) direction each placement pass — for a consumer whose own
   *  chrome depends on which side the pane opened (NotchedPane.onResize's publication pattern). */
  onDirection?: (dir: PickerDirection) => void
}): React.JSX.Element | null {
  const selfManaged = open !== undefined
  const { mounted, closing: exitClosing } = useExitPresence(open ?? true)
  const closing = selfManaged ? exitClosing : closingProp
  // A picker unmounted while open/exiting skips its Bloom-out — every consumer must mount
  // persistently and drive `open`; this screams in dev when one doesn't.
  const liveRef = useRef(false)
  liveRef.current = selfManaged ? (open ?? false) || exitClosing : closingProp
  useEffect(
    () => () => {
      if (import.meta.env.DEV && liveRef.current)
        console.error(
          '[PickerMenu] unmounted while open/exiting — Bloom-out skipped. Mount persistently and ride `open`.',
        )
    },
    [],
  )
  const paneRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<HTMLSpanElement>(null)
  const [pos, setPos] = useState<{
    top?: number
    bottom?: number
    right?: number
    left?: number
    notchInset?: number
    notchInsetLeft?: number
    notchInsetBottom?: number
  } | null>(null)
  // Auto-flips to 'down' when the requested direction wouldn't fit the viewport. Down is the
  // terminal fallback, so flips always converge.
  const [effDir, setEffDir] = useState<PickerDirection>(direction)
  // Decided ONCE per open: re-deciding on every re-measure would let a growing pane teleport above
  // its trigger mid-interaction, yanking rows out from under the cursor.
  const decidedDir = useRef<PickerDirection | null>(null)
  // Keyed on `open`, not `mounted`: a fast reopen during the exit-timer window would otherwise
  // inherit stale placement and, if the trigger moved, park the pane off-screen.
  if (open === false && decidedDir.current !== null) decidedDir.current = null

  // NotchedPane already measures itself for the beak path and publishes it here, so placement never
  // re-reads the element the shell owns. `place` being null is what freezes the pane through Bloom-out.
  const paneBox = useRef({ w: 0, h: 0 })
  const place = useRef<(() => void) | null>(null)
  const onPaneResize = useCallback((w: number, h: number): void => {
    paneBox.current = { w, h }
    place.current?.()
  }, [])

  // `reserve` = how far the beak's clamp allows it toward the corner radius, so pushing the pane's
  // right edge `reserve` past the trigger centre lands the clamp-limited beak exactly on the trigger.
  const reserve = radius + notchWidth / 2 + 2
  useLayoutEffect(() => {
    // Freeze the pane's position through the Bloom-out: once closing, a trigger that detached or moved
    // (e.g. a pick re-grouped its row) must not re-measure to zeros and snap the fading pane away.
    if (!selfManaged || !mounted || closing) return
    const trigger = triggerRef?.current ?? markerRef.current?.parentElement
    if (!trigger) return
    const measure = (): void => {
      const t = trigger.getBoundingClientRect()
      const c = anchorX ?? t.left + t.width / 2
      const { w: pw, h: ph } = paneBox.current
      let eff = decidedDir.current ?? direction
      if (decidedDir.current === null) {
        if (direction === 'up' && t.top - GAP - ph < VIEWPORT_MARGIN) eff = 'down'
        else if (direction === 'left' && t.left - GAP - pw < VIEWPORT_MARGIN) eff = 'down'
        else if (direction === 'right' && t.right + GAP + pw > window.innerWidth - VIEWPORT_MARGIN)
          eff = 'down'
        else if (direction === 'down' && t.bottom + GAP + ph > window.innerHeight - VIEWPORT_MARGIN)
          eff = 'up'
        decidedDir.current = eff
      }
      setEffDir(eff)
      onDirection?.(eff)
      // Sideways: vertical mirror of the right-anchored default — anchor the far edge, beak `reserve` from it.
      if (eff === 'left' || eff === 'right') {
        const cy = t.top + t.height / 2
        const bottom = Math.max(VIEWPORT_MARGIN, window.innerHeight - cy - reserve)
        if (eff === 'right') setPos({ left: t.right + GAP, bottom, notchInsetBottom: reserve })
        else setPos({ right: window.innerWidth - t.left + GAP, bottom, notchInsetBottom: reserve })
        return
      }
      // Centred origin: straddle the trigger, clamped by half-width so an edge trigger can't push it off-screen.
      if (origin === 'center') {
        const half = pw / 2
        const left = Math.min(
          Math.max(c, VIEWPORT_MARGIN + half),
          window.innerWidth - VIEWPORT_MARGIN - half,
        )
        // The beak slides to the anchor: the layer is translateX(-50%)-anchored, so the inset
        // measures from its left EDGE (left − half). Unclamped this reduces to half — exactly the
        // centered beak every existing consumer already shows; a viewport clamp is what moves it.
        const notchInsetLeft = c - (left - half)
        if (eff === 'up') setPos({ bottom: window.innerHeight - t.top + GAP, left, notchInsetLeft })
        else setPos({ top: t.bottom + GAP, left, notchInsetLeft })
        return
      }
      // Mirror of the default: pin the LEFT edge `reserve` before the anchor so the pane grows
      // rightward and a row's x never moves when content resizes.
      if (origin === 'left') {
        const left = Math.min(
          Math.max(VIEWPORT_MARGIN, c - reserve),
          Math.max(VIEWPORT_MARGIN, window.innerWidth - VIEWPORT_MARGIN - pw),
        )
        const vertical =
          eff === 'up' ? { bottom: window.innerHeight - t.top + GAP } : { top: t.bottom + GAP }
        setPos({ ...vertical, left, notchInsetLeft: reserve })
        return
      }
      const right = Math.max(VIEWPORT_MARGIN, window.innerWidth - c - reserve)
      if (eff === 'up')
        setPos({ bottom: window.innerHeight - t.top + GAP, right, notchInset: reserve })
      else setPos({ top: t.bottom + GAP, right, notchInset: reserve })
    }
    place.current = measure
    measure()
    // Capture-phase scroll fires on EVERY scroll in the document, and measure() forces a layout —
    // coalesce to one re-measure per frame so scrolling behind an open picker doesn't reflow per event.
    let raf = 0
    const measureOnFrame = (): void => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        measure()
      })
    }
    const ro = new ResizeObserver(measure)
    ro.observe(trigger)
    window.addEventListener('scroll', measureOnFrame, true)
    window.addEventListener('resize', measureOnFrame)
    return () => {
      place.current = null
      ro.disconnect()
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', measureOnFrame, true)
      window.removeEventListener('resize', measureOnFrame)
    }
  }, [selfManaged, mounted, reserve, triggerRef, closing, origin, direction, anchorX, width, onDirection])

  // Outside clicks dismiss via the backdrop below the pane (rendered in the portal). Escape is handled
  // here since the backdrop only catches pointers.
  useEffect(() => {
    if (!selfManaged || !onDismiss || open !== true || closing) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      // Mark the Escape handled (the house contract): window-level closers check defaultPrevented,
      // so one press dismisses the picker WITHOUT also collapsing the pane/window hosting it.
      e.preventDefault()
      onDismiss()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [selfManaged, onDismiss, open, closing])

  // A body-portalled pane sits at the END of the document's tab order — without this, Tab from the
  // trigger walks the whole app before reaching the menu it just opened.
  const managed = selfManaged && manageFocus
  const focusReturn = useRef<HTMLElement | null>(null)
  const tookFocus = useRef(false)
  // The return target is read in a LAYOUT effect: a field the pane's own children focus from their
  // mount effects would otherwise be captured as "where focus came from" and stranded on close.
  useLayoutEffect(() => {
    if (!managed || open !== true) return
    const from = document.activeElement
    focusReturn.current =
      from instanceof HTMLElement && !paneRef.current?.contains(from) ? from : null
  }, [managed, open])

  // Gated on a measured placement, not just mount: the pane is visibility:hidden until it's placed,
  // and focus() on a hidden element is a silent no-op.
  const placed = pos !== null
  useEffect(() => {
    if (!managed || open !== true || closing || !placed || tookFocus.current) return
    tookFocus.current = true
    const pane = paneRef.current
    // A child that focuses itself (a rename field) is the authority on where the caret belongs.
    if (!pane || pane.contains(document.activeElement)) return
    ;(tabStops(pane)[0] ?? pane).focus()
  }, [managed, open, closing, placed])

  // Restore on the open→false edge (and on an unmount that skips it), never mid-Bloom-out from a
  // detached trigger — and never over a target the user has already moved focus to themselves.
  useEffect(() => {
    if (!managed || open !== true) return
    return () => {
      tookFocus.current = false
      const back = focusReturn.current
      focusReturn.current = null
      if (!back?.isConnected) return
      const active = document.activeElement
      if (active && active !== document.body && !paneRef.current?.contains(active)) return
      back.focus({ preventScroll: true })
    }
  }, [managed, open])

  const trapTab = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key !== 'Tab' || e.ctrlKey || e.metaKey || e.altKey) return
    const pane = paneRef.current
    if (!pane) return
    const stops = tabStops(pane)
    const edge = e.shiftKey ? stops[0] : stops[stops.length - 1]
    if (stops.length > 0 && document.activeElement !== edge && document.activeElement !== pane)
      return
    e.preventDefault()
    ;(e.shiftKey ? stops[stops.length - 1] : stops[0])?.focus()
  }

  const up = effDir === 'up'
  const horizontal = effDir === 'left' || effDir === 'right'
  const notchSide =
    effDir === 'up' ? 'bottom' : effDir === 'left' ? 'right' : effDir === 'right' ? 'left' : 'top'
  const pane = (
    <NotchedPane
      // bareSurface or a sideways pane owns its full gutter via contentClassName — the top/bottom
      // notch gutter is either unwanted or the wrong axis.
      className={
        horizontal || bareSurface
          ? contentClassName
          : cx(s.surface, up && s.surfaceUp, contentClassName)
      }
      animationClass={closing ? dropdownClose : dropdownOpen}
      solid={solid}
      radius={radius}
      notchWidth={notchWidth}
      notchHeight={notchHeight}
      notchCurve={notchCurve}
      notchInsetRight={pos?.notchInset}
      notchInsetLeft={pos?.notchInsetLeft}
      notchInsetBottom={pos?.notchInsetBottom}
      notchSide={notchSide}
      onResize={onPaneResize}
      // Through the Bloom-out the pane paints but mustn't ACT: content goes pointer-inert so a stray
      // click can't re-fire an option, while the layer below stays interactive to swallow the click.
      style={{
        ...(width !== undefined ? { width } : null),
        ...style,
        ...(closing ? { pointerEvents: 'none' as const } : null),
      }}
    >
      {/* The surface keeps the notch gutter (must never scroll) — the frame's body is the ONE
          overflow region + edge fade. */}
      {maxHeight === undefined ? (
        children
      ) : (
        <MenuScrollFrame maxHeight={maxHeight}>{children}</MenuScrollFrame>
      )}
    </NotchedPane>
  )

  if (!selfManaged) {
    return <div className={up ? s.anchorUp : s.anchor}>{pane}</div>
  }

  // Closed (and past its exit) — render nothing, so no stray backdrop/pane sits over the page
  // swallowing hover/clicks. The marker only needs to exist while a placement is being measured.
  if (!mounted) return null

  return (
    <>
      <span ref={markerRef} aria-hidden style={{ display: 'none' }} />
      {createPortal(
        <>
          {onDismiss && !closing ? (
            // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: a click-catching backdrop — Escape is the keyboard dismissal
            <div
              className={s.backdrop}
              data-picker-portal
              onPointerDown={stopPointerBubble}
              onContextMenu={stopContextBubble}
              onClick={onDismiss}
            />
          ) : null}
          {/* biome-ignore lint/a11y/noStaticElementInteractions: a bubble guard, not a control */}
          <div
            ref={paneRef}
            className={s.layer}
            data-picker-portal
            tabIndex={managed ? -1 : undefined}
            onPointerDown={stopPointerBubble}
            onContextMenu={stopContextBubble}
            onKeyDown={managed ? trapTab : undefined}
            style={{
              // Vertical panes anchor by `top`; sideways panes by `bottom` (aiming the side beak).
              ...(pos?.top !== undefined ? { top: `${pos.top}px` } : null),
              ...(pos?.bottom !== undefined ? { bottom: `${pos.bottom}px` } : null),
              ...(pos?.left !== undefined
                ? {
                    left: `${pos.left}px`,
                    ...(origin === 'center' ? { transform: 'translateX(-50%)' } : null),
                  }
                : pos?.right !== undefined
                  ? { right: `${pos.right}px` }
                  : null),
              ...(pos ? null : { top: '0' }),
              visibility: pos ? undefined : 'hidden',
            }}
          >
            {pane}
          </div>
        </>,
        document.body,
      )}
    </>
  )
}

// Chip overflow (truncate + scroll) is handled by `chipLabel` in design-system/tokens — no overflow
// logic needed here.
export function PickerOption({
  children,
  onClick,
  selected = false,
  ring = false,
}: {
  children: ReactNode
  onClick?: () => void
  selected?: boolean
  /** Add the selection RING on top of the fill — for rows carrying no colour of their own, where the
   *  fill alone is easy to lose in a packed list. A chip row must NOT set this: its own fill
   *  already says "chosen", and two signals on one row read as two different states. */
  ring?: boolean
}): React.JSX.Element {
  return (
    <button
      type="button"
      className={cx(s.option, selected && s.optionSelected, selected && ring && s.optionRing)}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
