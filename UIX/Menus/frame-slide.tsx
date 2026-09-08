import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cx } from '../Utilities/cx'
import { duration, ms } from '../Animations/motion'
import { useExitPresence } from '../Animations/useExitPresence'
import * as s from './frame-slide.css'

const SLIDE_MS = ms(duration.base)

/** Never caps or scrolls a slot's height: a slot needing a ceiling wraps its content in a `MenuScrollFrame`, since two scrolling containers break the slide. */
export function FrameSlide({
  open,
  root,
  detail,
  minWidth,
  maxWidth,
  minHeight,
}: {
  open: boolean
  root: ReactNode
  detail: ReactNode
  minWidth?: number
  maxWidth?: number
  /** Height floor (px) per slot, so a sparse pane's footer pins to the bottom. */
  minHeight?: number
}): React.JSX.Element {
  const aRef = useRef<HTMLDivElement>(null)
  const bRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ aw: 0, ah: 0, bw: 0, bh: 0 })
  const [enabled, setEnabled] = useState(false)
  // Flipped a frame after the detail mounts, so the observer has a target to animate to.
  const [active, setActive] = useState<'a' | 'b'>('a')
  useEffect(() => {
    if (!open) {
      setActive('a')
      return
    }
    const raf = requestAnimationFrame(() => setActive('b'))
    return () => cancelAnimationFrame(raf)
  }, [open])

  // The caller nulls `detail` the same render the slide-out starts; latching keeps the measured box stable.
  const { mounted } = useExitPresence(open, SLIDE_MS)
  const latchedDetail = useRef<ReactNode>(null)
  if (open) latchedDetail.current = detail
  const shownDetail = open ? detail : mounted ? latchedDetail.current : null

  useLayoutEffect(() => {
    const a = aRef.current
    const b = bRef.current
    if (!a || !b) return
    // Layout box, never a client rect: the surface opens on a scale.
    const measure = (): void =>
      setSize({ aw: a.offsetWidth, ah: a.offsetHeight, bw: b.offsetWidth, bh: b.offsetHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(a)
    ro.observe(b)
    return () => ro.disconnect()
  }, [])

  // Armed only after the first paint, so the pane snaps to its measured size instead of growing.
  useEffect(() => setEnabled(true), [])

  // Height eases only across a flip; an in-place resize tracks content live.
  const [navigating, setNavigating] = useState(false)
  const firstFlip = useRef(true)
  // Before paint, not after: a passive effect blinks the outgoing slot out at the head of a slide.
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
  const height = active === 'a' ? size.ah : size.bh
  const shift = active === 'b' ? size.aw : 0
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
          <div ref={aRef} className={s.slotContent} style={{ minWidth, maxWidth, minHeight }}>
            {root}
          </div>
        </div>
        <div className={cx(s.slot, idle('b') && s.slotIdle)} inert={active === 'a'}>
          <div ref={bRef} className={s.slotContent} style={{ minWidth, maxWidth, minHeight }}>
            {shownDetail}
          </div>
        </div>
      </div>
    </div>
  )
}
