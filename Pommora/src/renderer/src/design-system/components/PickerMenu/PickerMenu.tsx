import {
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
import { GlassPane } from '../../materials'
import { MenuItem, MenuScrollFrame } from '../menu/Menu'
import { Icon } from '../../symbols'
import { cx } from '../../cx'
import { DROPDOWN_GAP as GAP } from '../dropdownAnchor'
import * as s from './pickerMenu.css'

const VIEWPORT_MARGIN = 8
// The chosen-row mark reads at the shared menu-row glyph size.
const CHECK = 12

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

/** KNOB — how far past the trigger's centre the pane's near edge sits, and with it where the Bloom
 *  starts. `MenuSurface` is the one shell that still wears a beak; here the same offset survives as
 *  an origin-only figure, so a pane still zooms out of the point nearest what opened it. */
const ANCHOR_RESERVE = 30

// How far the Bloom's start point stays off a corner, so it never originates outside the pane's arc.
const CORNER_CLEAR = s.PANE_RADIUS + 2

export function PickerMenu({
  children,
  open,
  onDismiss,
  triggerRef,
  closing: closingProp = false,
  solid = false,
  direction = 'down',
  origin = 'auto',
  anchorX,
  anchorY,
  anchorHeight = 0,
  bounds,
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
  direction?: PickerDirection
  /** `auto` centres the pane on its trigger when it fits there whole, and falls back to the
   *  right-edge anchor when centring would have to be clamped against a viewport edge. Name an
   *  edge to pin one: a pane whose content RESIZES while open must, or its rows walk sideways
   *  out from under the cursor. */
  origin?: 'auto' | 'right' | 'center' | 'left'
  anchorX?: number
  /** Pair with `anchorX` to open at a POINT — a right-click's cursor — instead of against an
   *  element. Both together stand in for the trigger entirely, so no `triggerRef` is needed. */
  anchorY?: number
  /** How tall the anchored thing is, for a point that isn't one: a text caret is a LINE, and a pane
   *  that flips above a zero-height anchor lands back over it. */
  anchorHeight?: number
  /** The box the pane slides within, viewport coords; the viewport when omitted. A pane that stops
   *  at the window edge has already crossed whatever pane sits beside its own. */
  bounds?: { left: number; right: number }
  maxHeight?: number
  /** Pair with `origin="left"`: without this, widening content near a viewport edge still drags
   *  every row sideways via the position clamp. */
  width?: number
  bareSurface?: boolean
  manageFocus?: boolean
  contentClassName?: string
  style?: CSSProperties
  /** Reports the effective (post-flip) direction each placement pass — for a consumer whose own
   *  chrome depends on which side the pane opened. */
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
  const glassRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<HTMLSpanElement>(null)
  const [pos, setPos] = useState<{
    top?: number
    bottom?: number
    right?: number
    left?: number
    /** Where the Bloom starts — the point on the pane's edge nearest the trigger, as a
     *  `transform-origin` pair. */
    origin?: string
    /** Straddling the trigger, so the layer needs its half-width shift. */
    centred?: boolean
  } | null>(null)
  // Auto-flips to 'down' when the requested direction wouldn't fit the viewport. Down is the
  // terminal fallback, so flips always converge.
  const [effDir, setEffDir] = useState<PickerDirection>(direction)
  // Decided ONCE per open: re-deciding on every re-measure would let a growing pane teleport above
  // its trigger mid-interaction, yanking rows out from under the cursor.
  const decidedDir = useRef<PickerDirection | null>(null)
  // Decided once per open for the same reason: a pane that grows past the point where centring fits
  // must not hop to an edge anchor mid-interaction.
  const decidedCentre = useRef<boolean | null>(null)
  // Keyed on `open`, not `mounted`: a fast reopen during the exit-timer window would otherwise
  // inherit stale placement and, if the trigger moved, park the pane off-screen.
  if (open === false && decidedDir.current !== null) {
    decidedDir.current = null
    decidedCentre.current = null
  }

  // The pane's own size, watched here because placement is the only thing that needs it. `place`
  // being null is what freezes the pane through the Bloom-out.
  const paneBox = useRef({ w: 0, h: 0 })
  const place = useRef<(() => void) | null>(null)
  useLayoutEffect(() => {
    const el = glassRef.current
    if (!el) return
    // Bail on unchanged sizes: the RO fires every frame while pane content animates its height, and
    // a placement pass forces layout. offsetWidth/Height are integral, so jitter can't defeat it.
    const measure = (): void => {
      const w = el.offsetWidth
      const h = el.offsetHeight
      if (paneBox.current.w === w && paneBox.current.h === h) return
      paneBox.current = { w, h }
      place.current?.()
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [mounted])

  useLayoutEffect(() => {
    // Freeze the pane's position through the Bloom-out: once closing, a trigger that detached or moved
    // (e.g. a pick re-grouped its row) must not re-measure to zeros and snap the fading pane away.
    if (!selfManaged || !mounted || closing) return
    // A point anchor is a zero-size rect at the cursor: every branch below reads the trigger's
    // edges, and collapsing them onto one coordinate is what "open here" means.
    const point =
      anchorX !== undefined && anchorY !== undefined
        ? {
            left: anchorX,
            right: anchorX,
            top: anchorY,
            bottom: anchorY + anchorHeight,
            width: 0,
            height: anchorHeight,
          }
        : null
    const trigger = triggerRef?.current ?? markerRef.current?.parentElement
    const rectOf = point ? () => point : trigger ? () => trigger.getBoundingClientRect() : null
    if (!rectOf) return
    const measure = (): void => {
      const t = rectOf()
      const c = anchorX ?? t.left + t.width / 2
      const edgeL = (bounds?.left ?? 0) + VIEWPORT_MARGIN
      const edgeR = (bounds?.right ?? window.innerWidth) - VIEWPORT_MARGIN
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
      // The Bloom's start point, kept clear of the corner arc on whichever edge it lands on.
      const edge = (along: number, at: number): number =>
        Math.min(Math.max(at, CORNER_CLEAR), Math.max(CORNER_CLEAR, along - CORNER_CLEAR))
      // Sideways: vertical mirror of the right-anchored default — anchor the far edge, start point in from it.
      if (eff === 'left' || eff === 'right') {
        const cy = t.top + t.height / 2
        const bottom = Math.max(VIEWPORT_MARGIN, window.innerHeight - cy - ANCHOR_RESERVE)
        const y = edge(ph, ph - ANCHOR_RESERVE)
        if (eff === 'right') setPos({ left: t.right + GAP, bottom, origin: `0px ${y}px` })
        else setPos({ right: window.innerWidth - t.left + GAP, bottom, origin: `${pw}px ${y}px` })
        return
      }
      const near = (x: number): string => `${edge(pw, x)}px ${eff === 'up' ? ph : 0}px`
      // Every vertical placement hangs off the same edge of the anchor; only the horizontal anchor
      // below tells them apart.
      const vertical =
        eff === 'up' ? { bottom: window.innerHeight - t.top + GAP } : { top: t.bottom + GAP }
      // `auto` takes the centred placement only where it lands whole — a centred pane that had to be
      // clamped sits off its trigger anyway, and the edge anchor at least stays put as content grows.
      if (decidedCentre.current === null)
        decidedCentre.current =
          origin === 'center' ||
          (origin === 'auto' && c - pw / 2 >= edgeL && c + pw / 2 <= edgeR)
      // Centred origin: straddle the trigger, clamped by half-width so an edge trigger can't push it off-screen.
      if (decidedCentre.current) {
        const half = pw / 2
        const left = Math.min(Math.max(c, edgeL + half), edgeR - half)
        // The start point slides to the anchor: the layer is translateX(-50%)-anchored, so it
        // measures from the pane's left EDGE (left − half). Unclamped this reduces to half — dead
        // centre, which is what an unclamped pane already shows; a viewport clamp is what moves it.
        setPos({ ...vertical, left, centred: true, origin: near(c - (left - half)) })
        return
      }
      // Mirror of the default: pin the LEFT edge that far before the anchor so the pane grows
      // rightward and a row's x never moves when content resizes.
      if (origin === 'left') {
        const left = Math.min(Math.max(edgeL, c - ANCHOR_RESERVE), Math.max(edgeL, edgeR - pw))
        setPos({ ...vertical, left, origin: near(ANCHOR_RESERVE) })
        return
      }
      // The default anchors the pane's RIGHT edge, so the bound arrives mirrored: an inset from the
      // window's right rather than a coordinate from its left.
      const right = Math.max(window.innerWidth - edgeR, window.innerWidth - c - ANCHOR_RESERVE)
      setPos({ ...vertical, right, origin: near(pw - ANCHOR_RESERVE) })
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
    if (trigger && !point) ro.observe(trigger)
    window.addEventListener('scroll', measureOnFrame, true)
    window.addEventListener('resize', measureOnFrame)
    return () => {
      place.current = null
      ro.disconnect()
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', measureOnFrame, true)
      window.removeEventListener('resize', measureOnFrame)
    }
  }, [
    selfManaged,
    mounted,
    triggerRef,
    closing,
    origin,
    direction,
    anchorX,
    anchorHeight,
    bounds,
    anchorY,
    width,
    onDirection,
  ])

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
  // A rounded rect is a border and a radius, so the material draws its own outline, lighting and
  // shadow — nothing is suppressed and re-drawn by hand. The Bloom class rides the frost element
  // ITSELF: on an ancestor it would become the backdrop root and the backdrop-filter would silently
  // sample nothing.
  const pane = (
    <GlassPane
      ref={glassRef}
      solid={solid}
      className={cx(s.pane, !bareSurface && s.surface, contentClassName, closing ? dropdownClose : dropdownOpen)}
      // Through the Bloom-out the pane paints but mustn't ACT: content goes pointer-inert so a stray
      // click can't re-fire an option, while the layer below stays interactive to swallow the click.
      style={
        {
          ...(pos?.origin ? { '--dropdown-origin': pos.origin } : null),
          ...(width !== undefined ? { width } : null),
          ...style,
          ...(closing ? { pointerEvents: 'none' as const } : null),
        } as CSSProperties
      }
    >
      {/* The surface keeps its gutter (must never scroll) — the frame's body is the ONE overflow
          region + edge fade. */}
      {maxHeight === undefined ? (
        children
      ) : (
        <MenuScrollFrame maxHeight={maxHeight}>{children}</MenuScrollFrame>
      )}
    </GlassPane>
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
              // Vertical panes anchor by `top`; sideways panes by `bottom`.
              ...(pos?.top !== undefined ? { top: `${pos.top}px` } : null),
              ...(pos?.bottom !== undefined ? { bottom: `${pos.bottom}px` } : null),
              ...(pos?.left !== undefined
                ? {
                    left: `${pos.left}px`,
                    ...(pos.centred ? { transform: 'translateX(-50%)' } : null),
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

/**
 * A menu opened AT a point — the cursor of the right-click that spawned it, rather than an element.
 * The caller holds that point in state and keeps its own `state && …` guard, which is what narrows
 * the rest of the state it captured alongside the coordinates.
 */
export function PointMenu({
  at,
  onDismiss,
  children,
}: {
  at: { x: number; y: number }
  onDismiss: () => void
  children: ReactNode
}): React.JSX.Element {
  return (
    <PickerMenu solid open onDismiss={onDismiss} anchorX={at.x} anchorY={at.y} origin="center">
      {children}
    </PickerMenu>
  )
}

/** The row for a FIXED option set — leading label, trailing mark on the chosen one, the native
 *  pop-up idiom. `PickerOption` below is its counterpart for user-authored values, whose chips carry
 *  their own colour and say "chosen" by fill. */
export function MenuOption({
  children,
  onClick,
  selected = false,
  leading,
  disabled = false,
  className,
}: {
  children: ReactNode
  onClick?: () => void
  selected?: boolean
  leading?: ReactNode
  disabled?: boolean
  className?: string
}): React.JSX.Element {
  return (
    <MenuItem
      className={className}
      leading={leading}
      disabled={disabled}
      trailing={
        <Icon
          name="check"
          size={CHECK}
          className={cx(s.chosenMark, !selected && s.chosenMarkHidden)}
        />
      }
      onClick={onClick}
    >
      {children}
    </MenuItem>
  )
}

// Chip overflow (truncate + scroll) is handled by `chipLabel` in design-system/tokens — no overflow
// logic needed here.
export function PickerOption({
  children,
  onClick,
  selected = false,
  ring = false,
  leading,
}: {
  children: ReactNode
  onClick?: () => void
  selected?: boolean
  /** Add the selection RING on top of the fill — for rows carrying no colour of their own, where the
   *  fill alone is easy to lose in a packed list. A chip row must NOT set this: its own fill
   *  already says "chosen", and two signals on one row read as two different states. */
  ring?: boolean
  /** A glyph ahead of the label. A row that leads with one reads left — a centred cluster leaves a
   *  ragged glyph column — so the slot carries that alignment rather than each caller restating it. */
  leading?: ReactNode
}): React.JSX.Element {
  return (
    <button
      type="button"
      className={cx(s.option, selected && s.optionSelected, selected && ring && s.optionRing)}
      onClick={onClick}
    >
      {leading == null ? (
        children
      ) : (
        <span className={s.leadingRow}>
          {leading}
          {children}
        </span>
      )}
    </button>
  )
}
