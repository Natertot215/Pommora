import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal, flushSync } from 'react-dom'
import { pickerBloom } from '../Animations/animations.css'
import { useExitPresence, useHeld } from '../Animations/useExitPresence'
import { GlassSurface } from '../Glass/GlassSurface'
import { GlassWindow } from '../Glass/GlassWindow'
import { SHIELD_ATTR, useDismissal } from '../Interactions/dismissalStack'
import { useFocusScope } from '../Interactions/focusScope'
import { keepFocus } from '../Interactions/shared'
import { cx } from '../Utilities/cx'
import { useLatest } from '../Utilities/stableApi'
import { BASE_FEEL } from '../Animations/feel'
import { SlideGrowth } from './FrameSlide'
import {
  placePane,
  roomAround,
  sideFor,
  type PanePoint,
  type PanePos,
  type PaneDirection,
} from './panePlacement'
import type { PaneResize } from './usePaneResize'
import * as s from './menu-base.css'

/** The portal layer a floating pane occupies. Containment reads against this rather than the pane's body, so the pane's own rim and resize edges are inside it. */
export const PICKER_PORTAL_ATTR = 'data-picker-portal'

const stopPointerBubble = (e: { stopPropagation: () => void }): void => e.stopPropagation()
const stopContextBubble = (e: {
  stopPropagation: () => void
  preventDefault: () => void
}): void => {
  e.stopPropagation()
  e.preventDefault()
}

const POS_KEYS = ['top', 'bottom', 'right', 'left', 'origin'] as const
const samePos = (a: PanePos | null, b: PanePos): boolean =>
  a !== null && POS_KEYS.every((k) => a[k] === b[k])
// A fixed pane on a half-pixel offset composites its text blurry under the frost, and a measured trigger sits on one whenever its layout does.
const snapped = (p: PanePos): PanePos => ({
  ...p,
  ...(p.top !== undefined && { top: Math.round(p.top) }),
  ...(p.bottom !== undefined && { bottom: Math.round(p.bottom) }),
  ...(p.left !== undefined && { left: Math.round(p.left) }),
  ...(p.right !== undefined && { right: Math.round(p.right) }),
})

// Reads `el`'s size into `box`, answering whether it moved.
const resized = (el: HTMLElement, box: RefObject<{ w: number; h: number }>): boolean => {
  const w = el.offsetWidth
  const h = el.offsetHeight
  if (box.current.w === w && box.current.h === h) return false
  box.current = { w, h }
  return true
}

export function MenuBase({
  children,
  open,
  onDismiss,
  triggerRef,
  solid = false,
  glass = 'surface',
  enter = true,
  onExited,
  direction = 'down',
  origin = 'auto',
  at,
  centerX,
  bounds,
  bareSurface = false,
  focus = 'trap',
  modal = true,
  ownShield = false,
  contentClassName,
  resize,
}: {
  children: ReactNode
  open: boolean
  onDismiss?: () => void
  triggerRef?: RefObject<Element | null>
  /** The Solid variation is a deliberate stacked-picker opt-in style; it's explicitly not part of the nearly identical GlassWindow. */
  solid?: boolean
  glass?: 'surface' | 'window'
  /** A frozen replica (a pinned glance) passes false so it appears in place rather than blooming in over the pane it replaced; it still blooms out on close. */
  enter?: boolean
  /** Fired once a close has played out and the menu has unmounted itself — the cue to remove the entry that drove `open`. */
  onExited?: () => void
  direction?: PaneDirection
  origin?: 'auto' | 'right' | 'center' | 'left'
  at?: PanePoint
  centerX?: number
  bounds?: { left: number; right: number }
  bareSurface?: boolean
  /** `trap` takes focus and holds Tab inside; `leave` takes none on open, though a field inside takes it when pressed; `keep` takes none, so a press anywhere in the pane but inside a field leaves focus with its owner, claimed as it enters the pane, before an editor inside reads it and moves focus itself. Under `keep` the trigger belongs to the pane, so pressing it never closes the pane, and the pane stays modal, Escape and outside presses closing it, but draws no shield, so an outside press that closes it also lands. */
  focus?: 'trap' | 'leave' | 'keep'
  /** A glance surface passes false and lets the app's own dismissals through. */
  modal?: boolean
  /** A dropdown list inside another pane draws its own shield, so a press beside it closes the list alone. */
  ownShield?: boolean
  contentClassName?: string
  /** A pane the user sizes from its free edges — `usePaneResize`'s, held by the host that applies the size. */
  resize?: PaneResize
}): React.JSX.Element | null {
  const { mounted, closing } = useExitPresence(open, 'menu')
  const paneRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<HTMLSpanElement>(null)
  const drawsShield = useDismissal(mounted && modal, closing, {
    layer: () => paneRef.current,
    trigger: () => triggerRef?.current ?? markerRef.current?.parentElement ?? null,
    triggerInside: focus === 'keep',
    dismiss: onDismiss,
    shield: onDismiss !== undefined && focus !== 'keep',
  })
  const liveRef = useLatest(open || closing)
  const dismissRef = useLatest(onDismiss)
  useEffect(
    () => () => {
      // A pane nothing dismisses leaves with its host, as a pinned glance does with its tab, so only a dismissable one has a Bloom-out to lose.
      if (import.meta.env.DEV && liveRef.current && dismissRef.current !== undefined)
        console.error(
          '[MenuBase] unmounted while open/exiting — Bloom-out skipped. Mount persistently and ride `open`.',
        )
    },
    [],
  )
  // Fire onExited once a real close has played through: closing latches, then the mounted→false at the end of the exit is its completion.
  const wasClosing = useRef(false)
  useEffect(() => {
    if (closing) wasClosing.current = true
    else if (!mounted && wasClosing.current) {
      wasClosing.current = false
      onExited?.()
    }
  }, [mounted, closing, onExited])

  const body = useHeld(children, open)
  const placeResize = resize?.place

  const glassRef = useRef<HTMLDivElement>(null)
  const [pos, setPosState] = useState<PanePos | null>(null)
  const setPos = (raw: PanePos): void => {
    const next = snapped(raw)
    setPosState((prev) => (samePos(prev, next) ? prev : next))
  }
  const decidedSide = useRef<PaneDirection | null>(null)
  const decidedCenter = useRef<boolean | null>(null)
  const decidedFor = useRef<Element | null | undefined>(null)
  if (!open && decidedSide.current !== null) {
    decidedSide.current = null
    decidedCenter.current = null
  }

  const paneBox = useRef({ w: 0, h: 0 })
  const place = useRef<((growth?: number) => void) | null>(null)
  const slideGrew = useRef((by: number): void => place.current?.(by)).current
  useLayoutEffect(() => {
    const el = glassRef.current
    if (!el) return
    const measure = (): void => {
      if (resized(el, paneBox)) place.current?.()
    }
    measure()
    const ro = new ResizeObserver(() => flushSync(measure))
    ro.observe(el)
    return () => ro.disconnect()
  }, [mounted])

  useLayoutEffect(() => {
    // Frozen through the Bloom-out: a detached or moved trigger must not re-measure to zeros and snap the fading pane away.
    if (!mounted || !open) return
    const point = at ? { left: at.x, top: at.y, bottom: at.y + (at.height ?? 0), width: 0 } : null
    const trigger = triggerRef?.current ?? markerRef.current?.parentElement
    if (trigger !== decidedFor.current) {
      decidedFor.current = trigger
      decidedSide.current = null
      decidedCenter.current = null
    }
    const rectOf = point ? () => point : trigger ? () => trigger.getBoundingClientRect() : null
    if (!rectOf) return
    const measure = (growth = 0): void => {
      if (trigger && !point && !trigger.isConnected) {
        dismissRef.current?.()
        return
      }
      const t = rectOf()
      const pane = paneBox.current
      const view = { w: window.innerWidth, h: window.innerHeight }
      const held = decidedSide.current
      let side = held ?? direction
      if (held === null || growth > 0) {
        const room = roomAround(t, view.h)
        side = sideFor(side, pane.h + growth, room)
        if (held === null) placeResize?.({ dir: side, room: room[side] }, glassRef.current!)
      }
      const was =
        held !== null && side !== held ? paneRef.current?.getBoundingClientRect().top : undefined
      decidedSide.current = side
      const { pos: next, centered } = placePane({
        t,
        pane,
        view,
        side,
        centered: decidedCenter.current,
        origin,
        centerX,
        bounds,
      })
      decidedCenter.current = centered
      setPos(next)
      if (was !== undefined) {
        const nextTop = next.top ?? view.h - next.bottom! - pane.h
        paneRef.current?.animate(
          [{ transform: `translateY(${was - nextTop}px)` }, { transform: 'none' }],
          BASE_FEEL,
        )
      }
    }
    place.current = measure
    measure()
    let raf = 0
    const measureOnFrame = (): void => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        flushSync(measure)
      })
    }
    const ro = new ResizeObserver(() => flushSync(measure))
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
    mounted,
    triggerRef,
    // A ref swapped to another trigger re-places the pane; one nulled by its trigger unmounting keeps the last, whose observer then sees it leave.
    triggerRef?.current ?? decidedFor.current,
    open,
    origin,
    direction,
    at?.x,
    at?.y,
    at?.height,
    centerX,
    bounds,
    placeResize,
  ])

  // A child that builds its content in an effect, as an editor does, leaves the pane empty at the first measure, so a pane grown once its children's effects have run decides again.
  useEffect(() => {
    const el = glassRef.current
    if (!open || !el || !resized(el, paneBox)) return
    decidedSide.current = null
    decidedCenter.current = null
    place.current?.()
  }, [mounted, open])

  const placed = pos !== null
  const trap = focus === 'trap'
  const trapTab = useFocusScope(paneRef, trap && open, {
    ready: mounted && placed && !closing,
  })

  const Shell = { surface: GlassSurface, window: GlassWindow }[glass]
  const pane = (
    <Shell
      ref={glassRef}
      solid={glass === 'surface' ? solid : undefined}
      className={cx(
        s.pane,
        !bareSurface && s.surface,
        contentClassName,
        resize?.resizing && s.resizing,
        closing ? pickerBloom.close : enter ? pickerBloom.open : undefined,
      )}
      style={
        {
          ...(pos?.origin ? { '--menu-origin': pos.origin } : null),
          ...(closing ? { pointerEvents: 'none' as const } : null),
        } as CSSProperties
      }
    >
      <SlideGrowth.Provider value={resize ? null : slideGrew}>{body}</SlideGrowth.Provider>
      {resize?.edges}
    </Shell>
  )

  if (!mounted) return null

  return (
    <>
      <span ref={markerRef} hidden />
      {createPortal(
        <>
          {(drawsShield || ownShield) && !closing ? (
            // biome-ignore lint/a11y/noStaticElementInteractions: a shield, not a control
            <div
              className={s.shield}
              {...{ [PICKER_PORTAL_ATTR]: '' }}
              {...{ [SHIELD_ATTR]: '' }}
              onPointerDown={stopPointerBubble}
              onContextMenu={stopContextBubble}
            />
          ) : null}
          {/* biome-ignore lint/a11y/noStaticElementInteractions: a bubble guard, not a control */}
          <div
            ref={paneRef}
            className={s.layer}
            {...{ [PICKER_PORTAL_ATTR]: '' }}
            tabIndex={trap ? -1 : undefined}
            onPointerDown={stopPointerBubble}
            onMouseDownCapture={focus === 'keep' ? keepFocus : undefined}
            onContextMenu={stopContextBubble}
            onKeyDown={trap ? trapTab : undefined}
            style={{
              ...(pos?.top !== undefined ? { top: `${pos.top}px` } : null),
              ...(pos?.bottom !== undefined ? { bottom: `${pos.bottom}px` } : null),
              ...(pos?.left !== undefined
                ? { left: `${pos.left}px` }
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
