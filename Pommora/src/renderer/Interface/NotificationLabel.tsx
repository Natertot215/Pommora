import { useEffect, useRef, useState } from 'react'
import { useSession } from '@renderer/store'
import { duration, ms, paneSlide } from '@renderer/Animation'
import { ProgressBar } from '@renderer/DesignSystem/Elements/ProgressBar/ProgressBar'
import { useHeld } from '@renderer/Interactions/useHeld'
import { clamp } from '@shared/clamp'
import { cx } from '@renderer/DesignSystem/Util/cx'
import * as s from './notification-label.css'

const BASE_MS = ms(duration.base)
const MAX_STEP_MS = 100

export function NotificationLabel(): React.JSX.Element {
  const note = useSession((st) => st.notification)
  const dismiss = useSession((st) => st.dismissNotification)
  const hostRef = useRef<HTMLDivElement>(null)
  const nearRef = useRef(false)
  const [left, setLeft] = useState(1)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (!note) {
      setShown(false)
      return
    }
    setLeft(1)
    nearRef.current = false
    setShown(true)
  }, [note])

  useEffect(() => {
    if (!note || !shown) return
    let raf = 0
    let spent = 0
    let rate = 1
    let last = performance.now()
    const tick = (now: number): void => {
      // rAF stops while the window is hidden, so the gap on return is absence, not dwell.
      const step = Math.min(now - last, MAX_STEP_MS)
      last = now
      rate = clamp(rate + (nearRef.current ? -step : step) / BASE_MS, 0, 1)
      spent += step * rate
      const remaining = 1 - spent / s.DWELL_MS
      setLeft(remaining > 0 ? remaining : 0)
      if (remaining > 0) raf = requestAnimationFrame(tick)
      else setShown(false)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [note, shown])

  // The slide out is what retires it — the label is gone from the frame before the state clears.
  useEffect(() => {
    if (!note || shown) return
    const t = setTimeout(() => dismiss(note.id), BASE_MS)
    return () => clearTimeout(t)
  }, [note, shown, dismiss])

  // Proximity rather than hover: the pointer heading for the action reaches the drain before it
  // does, so the label can't leave out from under a reach.
  useEffect(() => {
    if (!note || !shown) return
    let rect: DOMRect | null = null
    const measure = (): void => {
      rect = hostRef.current?.getBoundingClientRect() ?? null
    }
    const settled = setTimeout(measure, BASE_MS)
    const onMove = (e: PointerEvent): void => {
      if (!rect) return
      const r = s.NEAR_RADIUS
      nearRef.current =
        e.clientX > rect.left - r &&
        e.clientX < rect.right + r &&
        e.clientY > rect.top - r &&
        e.clientY < rect.bottom + r
    }
    // The hold needs a release: a pointer that leaves the window stops reporting, and a `near`
    // left standing would freeze the drain on a label nothing is reaching for.
    const release = (): void => {
      nearRef.current = false
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerleave', release)
    window.addEventListener('blur', release)
    window.addEventListener('resize', measure)
    return () => {
      clearTimeout(settled)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', release)
      window.removeEventListener('blur', release)
      window.removeEventListener('resize', measure)
    }
  }, [note, shown])

  // Held so the label paints its own exit instead of retracting empty.
  const held = useHeld(note, note !== null)

  return (
    <div
      ref={hostRef}
      className={cx(
        s.host,
        paneSlide({ side: 'right', mode: 'overlay' }),
        shown && s.shown,
        held?.tone === 'error' && s.error,
      )}
      role={held?.tone === 'error' ? 'alert' : 'status'}
      inert={!shown}
    >
      <div className={s.row}>
        <span className={s.message}>{held?.message}</span>
        {held?.action ? (
          <button
            type="button"
            className={s.action}
            onClick={() => {
              if (!shown) return
              void held.action?.run()
              setShown(false)
            }}
          >
            {held.action.label}
          </button>
        ) : null}
      </div>
      <ProgressBar fill={left} />
    </div>
  )
}
