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

const VIEWPORT_MARGIN = 8 // keep the pane this far from the viewport edges

// A pointerdown inside the body-portalled picker must not bubble (React events cross portals) to a
// trigger's drag-handle ancestor and pointer-capture — which retargets the click to that handle and
// steals it. Stopping it here immunizes every consumer, not only triggers that stop pointerdown themselves.
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

// Uses the `dropdown` token (snappier, symmetric Bloom — same keyframes as the menu Bloom, shared with
// AutocompletePanel). The beaked shell is the shared NotchedPane; this stays the picker-flavoured skin.
//
// Two lifecycle modes:
//  • Self-managed (pass `open` + `onDismiss`): PickerMenu owns mount → Bloom-out → unmount via
//    useExitPresence, and renders on a fixed TOP LAYER (a body portal) so it escapes any clipping
//    ancestor — positioned at the trigger, beak aimed at it dynamically. A full-viewport backdrop
//    under the pane catches the outside click (and covers the trigger, so a toggle can't
//    dismiss-then-reopen); Escape closes too. Both layers carry `data-picker-portal` so a host's
//    useDismiss spares them (its containment check can't see through the portal). The one-liner
//    most pickers want.
//  • Manual (pass `closing`, mount the element yourself): inline, caller-driven — for the few
//    consumers with bespoke close logic (a multi-select picker that stays open on pick).
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
}: {
  children: ReactNode
  /** Self-managed mode: PickerMenu mounts/exits + portals + dismisses off this. Omit for manual mode. */
  open?: boolean
  /** Self-managed dismissal target (outside-click / Escape). */
  onDismiss?: () => void
  /** The element the picker hangs off — measured for placement (any `Element`: an icon glyph is an
   *  SVG). Falls back to the marker's parent when omitted. (Dismiss is handled by the backdrop.) */
  triggerRef?: RefObject<Element | null>
  /** Manual mode: the caller's exit flag, ridden to the Bloom-out. Ignored when `open` is set. */
  closing?: boolean
  /** The Solid variation: a window-background fill under the frost, reading opaque over any backdrop. */
  solid?: boolean
  radius?: number
  notchWidth?: number
  notchHeight?: number
  notchCurve?: number
  /** 'up' hangs the pane ABOVE its trigger with the beak pointing down (bottom-of-pane hosts). */
  direction?: 'down' | 'up' | 'left' | 'right'
  /** Which edge the pane is PINNED to, and therefore which way it grows when its content resizes.
   *  `right` (default) anchors the right edge — the stable dropdown. `center` straddles the anchor
   *  with a centred beak (the TextPicker rename field). `left` anchors the LEFT edge so a pane that
   *  widens — a disclosure opening a longer child row — grows rightward and leaves every row where
   *  the cursor found it, instead of walking the list sideways out from under the pointer. */
  origin?: 'right' | 'center' | 'left'
  /** Horizontal anchor override (viewport px). The pane straddles THIS x instead of the trigger's
   *  centre, so a value picker can drop from the click point rather than a fixed spot on the trigger. */
  anchorX?: number
  /** Height ceiling (px) before the body scrolls. Routes through the shared MenuScrollFrame, so the
   *  cap, the single overflow region, and the edge-fade all come from one place. */
  maxHeight?: number
  /** Fixed content width (px). Pair with `origin="left"` for a pane whose content resizes: a
   *  content-sized pane widens when a disclosure reveals a longer row, and near a viewport edge the
   *  clamp then drags it sideways — moving every row out from under the cursor mid-click. A fixed
   *  width removes the cause instead of fighting the symptom; long labels eclipse. */
  width?: number
  /** Drop the default surface gutter entirely — `contentClassName` is the ONLY surface class, so a
   *  bespoke body (the icon picker) owns 100% of its padding/layout with no `surface` collision. */
  bareSurface?: boolean
  /** The focus contract: the pane takes focus on open, keeps Tab inside it, and hands focus back to
   *  whatever held it when it opened. Turn OFF for a pane the pointer merely summons rather than
   *  commits to — a hover card must never pull the caret out of the surface underneath it. Manual
   *  mode ignores this entirely (an inline pane is already in the document's tab order). */
  manageFocus?: boolean
  /** Overrides the surface's content gutter (cx'd after the default) — for a picker that wants its own
   *  inset, e.g. the tight single-field TextPicker. */
  contentClassName?: string
  style?: CSSProperties
}): React.JSX.Element | null {
  const selfManaged = open !== undefined
  const { mounted, closing: exitClosing } = useExitPresence(open ?? true)
  const closing = selfManaged ? exitClosing : closingProp
  // The Bloom law's enforcement: a picker unmounted while open/exiting skips its Bloom-out. Every
  // consumer must mount persistently and drive `open` — this screams in dev when one doesn't.
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
  // The *effective* direction: the requested one, auto-flipped to 'down' when it wouldn't fit the
  // viewport (a sideways pane near the screen edge, an upward pane near the top). Down is the terminal
  // fallback, so flips converge — it never flips away from down.
  const [effDir, setEffDir] = useState<'down' | 'up' | 'left' | 'right'>(direction)
  // The flip is decided ONCE per open, not per measure. It reads the pane's height, so re-deciding on
  // every re-measure lets a pane that grows past the viewport floor — a disclosure opening rows —
  // teleport above its trigger mid-interaction, yanking every row out from under the cursor. Same rule
  // the horizontal origin follows: placement is settled on open, and content changes after that move
  // the pane's FAR edge, never the one anchored to the trigger. Cleared when the pane unmounts.
  const decidedDir = useRef<'down' | 'up' | 'left' | 'right' | null>(null)
  // Keyed on `open`, NOT `mounted`: mounted only drops when the exit timer fires, and reopening
  // inside that window cancels the timer — so a fast reopen would inherit the previous placement and,
  // on a shared anchor whose trigger moved, park the pane off-screen.
  if (open === false && decidedDir.current !== null) decidedDir.current = null

  // The pane's box arrives from the pane itself — NotchedPane measures it for the beak path and
  // publishes it here — so placement never observes or re-reads the element the shell already owns.
  // `place` is the live placement pass, null whenever the picker isn't placing: that null is what
  // freezes the pane through its Bloom-out.
  const paneBox = useRef({ w: 0, h: 0 })
  const place = useRef<(() => void) | null>(null)
  const onPaneResize = useCallback((w: number, h: number): void => {
    paneBox.current = { w, h }
    place.current?.()
  }, [])

  // The pane hangs off the trigger's right edge and opens down-left (a stable dropdown — the pane
  // doesn't move to center the beak). The beak lands as far right as the corner radius allows
  // (`reserve` = the notch's clamp), so we push the pane's right edge `reserve` past the trigger
  // center — then that clamp-limited beak sits exactly on the trigger. Re-runs on scroll/resize.
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
      // Collision test against the measured pane, then flip so the pane fits: any blocked side → down,
      // and down itself → up only when there's no room below (down is the preferred resting direction).
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
      // Sideways: sit beside the trigger; beak clamped onto its vertical centre (the vertical mirror of
      // the right-anchored dropdown — anchor the far edge, aim the beak `reserve` from it).
      if (eff === 'left' || eff === 'right') {
        const cy = t.top + t.height / 2
        const bottom = Math.max(VIEWPORT_MARGIN, window.innerHeight - cy - reserve)
        if (eff === 'right') setPos({ left: t.right + GAP, bottom, notchInsetBottom: reserve })
        else setPos({ right: window.innerWidth - t.left + GAP, bottom, notchInsetBottom: reserve })
        return
      }
      // Vertical. Centred (icon picker / TextPicker): straddle the trigger, beak centred on it, clamped
      // by the pane half-width so an edge trigger can't push it off-screen.
      if (origin === 'center') {
        const half = pw / 2
        const left = Math.min(
          Math.max(c, VIEWPORT_MARGIN + half),
          window.innerWidth - VIEWPORT_MARGIN - half,
        )
        if (eff === 'up') setPos({ bottom: window.innerHeight - t.top + GAP, left })
        else setPos({ top: t.bottom + GAP, left })
        return
      }
      // Left-anchored: the mirror of the default. Pin the LEFT edge `reserve` before the anchor and
      // aim the beak the same distance IN from that edge, so the pane grows rightward and a row's x
      // never moves when the content resizes. Clamped so a wide pane still can't leave the viewport.
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
      // The stable right-anchored dropdown, beak clamped onto the trigger centre.
      const right = Math.max(VIEWPORT_MARGIN, window.innerWidth - c - reserve)
      if (eff === 'up')
        setPos({ bottom: window.innerHeight - t.top + GAP, right, notchInset: reserve })
      else setPos({ top: t.bottom + GAP, right, notchInset: reserve })
    }
    place.current = measure
    measure()
    // The capture-phase scroll listener hears EVERY scroll in the document while the pane is open,
    // and measure() forces a layout — coalesce to one re-measure per frame so scrolling a grid
    // behind an open picker doesn't reflow per event.
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
  }, [selfManaged, mounted, reserve, triggerRef, closing, origin, direction, anchorX, width])

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

  // ── The focus contract (self-managed only). A body-portalled pane sits at the END of the document's
  // tab order, so without this a Tab from the trigger walks the whole app before reaching the menu it
  // just opened.
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

  // Render off the EFFECTIVE direction (post-flip), so the beak side + gutter match where the pane sits.
  const up = effDir === 'up'
  const horizontal = effDir === 'left' || effDir === 'right'
  const notchSide =
    effDir === 'up' ? 'bottom' : effDir === 'left' ? 'right' : effDir === 'right' ? 'left' : 'top'
  const pane = (
    <NotchedPane
      // A bespoke body (bareSurface) or a sideways pane owns its full gutter via contentClassName —
      // the top/bottom `--notch-h` surface gutter is either unwanted or the wrong axis; vertical
      // default panes keep the shared surface gutter.
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
      // Through the Bloom-out the pane still paints but must not ACT: its content goes pointer-inert so a
      // stray click can't re-fire an option mid-close. The layer below stays interactive (it swallows the
      // click) so it can't fall through to whatever sits behind — a card's nav/drag surface.
      style={{
        ...(width !== undefined ? { width } : null),
        ...style,
        ...(closing ? { pointerEvents: 'none' as const } : null),
      }}
    >
      {/* The cap rides the shared frame, not a local overflow: the surface keeps the notch gutter,
          which must never scroll, and the frame's body is the ONE overflow region + edge fade. */}
      {maxHeight === undefined ? (
        children
      ) : (
        <MenuScrollFrame maxHeight={maxHeight}>{children}</MenuScrollFrame>
      )}
    </NotchedPane>
  )

  // Manual (legacy) — inline, caller-mounted, centered beak.
  if (!selfManaged) {
    return <div className={up ? s.anchorUp : s.anchor}>{pane}</div>
  }

  // Closed (and past its exit) — render nothing, so no stray backdrop/pane sits over the page
  // swallowing hover/clicks. The marker only needs to exist while a placement is being measured.
  if (!mounted) return null

  // Self-managed — a fixed top layer (body portal) escaping any clipping ancestor, beak aimed
  // dynamically. The pane mounts hidden so it can be measured, then reveals at its computed spot.
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
            // React events cross portals, so a pointerdown on the pane (an option/row) would bubble to a
            // trigger's drag-handle ancestor and pointer-capture — stealing the click. Stop it here so any
            // consumer's picker is safe, not just ones whose trigger happens to stop pointerdown itself.
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
              // The layer stays interactive through the close (its content is pointer-inert above) so it
              // catches a click over the fading pane's footprint instead of leaking it to the page beneath.
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
  /** Add the selection RING on top of the fill — for rows carrying no colour of their own, where a
   *  5% fill alone is easy to lose in a packed list. A chip row must NOT set this: its own fill
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
