import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cx } from '../Util/cx'
import { duration, ms } from '../Animation'
import { useExitPresence } from '../Animation/useExitPresence'
import * as s from './frame-slide.css'

// The slide runs on `base`; a close holds the detail mounted exactly that long (below) so it slides
// OUT at full size instead of vanishing — a collapsing empty slot fed the ResizeObserver mid-slide,
// which was the slide-out jitter.
const SLIDE_MS = ms(duration.base)

/**
 * The one slide primitive every pane rides, so no surface hand-rolls its own push/back state.
 * Nesting composes: a detail may itself be a FrameSlide (each only slides + resizes, so the
 * inner height change just feeds the outer's ResizeObserver).
 *
 * The slider ONLY slides + resizes — it never caps or scrolls a slot. A slot that needs a ceiling or a
 * pinned footer wraps its content in a `MenuScrollFrame` (the single cap/scroll/footer source); the
 * slider just animates to the frame's already-capped height. This keeps the two mechanisms from
 * fighting (a slot scrolling AND a frame body scrolling was the double-container that broke the slide).
 */
export function FrameSlide({
  open,
  root,
  detail,
  minWidth,
  minHeight,
}: {
  /** false → show root (slot A); true → slide to the detail (slot B). */
  open: boolean
  root: ReactNode
  detail: ReactNode
  minWidth?: number
  /** Height floor (px) per slot, so a sparse pane's footer still pins to the bottom. */
  minHeight?: number
}): React.JSX.Element {
  const aRef = useRef<HTMLDivElement>(null)
  const bRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ aw: 0, ah: 0, bw: 0, bh: 0 })
  const [enabled, setEnabled] = useState(false)
  // The measure-then-flip: the detail mounts (slot B) the same render `open` turns true, so a frame
  // later the ResizeObserver has its height and the viewport animates to a known target instead of
  // snapping from `auto`. Back (open→false) flips immediately so the slide-out isn't held a frame.
  const [active, setActive] = useState<'a' | 'b'>('a')
  useEffect(() => {
    if (!open) {
      setActive('a')
      return
    }
    const raf = requestAnimationFrame(() => setActive('b'))
    return () => cancelAnimationFrame(raf)
  }, [open])

  // Hold the outgoing detail mounted through the slide-out: `open` flips false and `active` flips to
  // 'a' immediately (the slide starts), but the caller nulls `detail` the same render — so latch the
  // last real detail and keep rendering it until the slide lands, then drop it. The slot keeps its
  // measured box the whole way, so the ResizeObserver reads a stable size instead of a collapsing one.
  const { mounted } = useExitPresence(open, SLIDE_MS)
  const latchedDetail = useRef<ReactNode>(null)
  if (open) latchedDetail.current = detail
  const shownDetail = open ? detail : mounted ? latchedDetail.current : null

  useLayoutEffect(() => {
    const a = aRef.current
    const b = bRef.current
    if (!a || !b) return
    // Layout box, never a client rect: the surface opens on a scale, and a transformed rect would
    // read that mid-animation size as the pane's real one.
    const measure = (): void =>
      setSize({ aw: a.offsetWidth, ah: a.offsetHeight, bw: b.offsetWidth, bh: b.offsetHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(a)
    ro.observe(b)
    return () => ro.disconnect()
  }, [])

  // Arm the transitions only after the first paint, so the pane snaps to its measured size on open
  // instead of growing from 0 / sliding from an arbitrary start.
  useEffect(() => setEnabled(true), [])

  // Height eases ONLY across a navigation flip (active a↔b). Between flips the height stays untransitioned
  // so an in-place resize (a child Reveal, the spacer collapse) tracks content live — the child owns that
  // beat, and the viewport can't lag-chase a ResizeObserver that fires every animating frame (the bounce).
  const [navigating, setNavigating] = useState(false)
  const firstFlip = useRef(true)
  // Before paint, not after: the idle slot stops painting off this flag, and a passive effect would
  // let the frame where `active` has already moved paint with the outgoing slot hidden — a blink at
  // the head of every slide.
  useLayoutEffect(() => {
    if (firstFlip.current) {
      firstFlip.current = false
      return
    }
    setNavigating(true)
    const t = setTimeout(() => setNavigating(false), SLIDE_MS)
    return () => clearTimeout(t)
  }, [active])

  const width = active === 'a' ? size.aw : size.bw
  // The active slot's height (a MenuScrollFrame has already capped it) — the viewport animates to it.
  const height = active === 'a' ? size.ah : size.bh
  // Slide left by slot A's width to bring B flush against the viewport's left edge.
  const shift = active === 'b' ? size.aw : 0
  // Settled, the slot that isn't showing stops painting — see `slotIdle`.
  const idle = (slot: 'a' | 'b'): boolean => !navigating && active !== slot
  return (
    <div
      className={cx(s.viewport, enabled && s.viewportAnimated, navigating && s.viewportNav)}
      style={{ width: width || undefined, height: height || undefined }}
    >
      <div
        className={cx(s.track, enabled && s.trackAnimated)}
        style={{ transform: `translateX(-${shift}px)` }}
      >
        <div className={cx(s.slot, idle('a') && s.slotIdle)} inert={active === 'b'}>
          <div ref={aRef} className={s.slotContent} style={{ minWidth, minHeight }}>
            {root}
          </div>
        </div>
        <div className={cx(s.slot, idle('b') && s.slotIdle)} inert={active === 'a'}>
          <div ref={bRef} className={s.slotContent} style={{ minWidth, minHeight }}>
            {shownDetail}
          </div>
        </div>
      </div>
    </div>
  )
}
