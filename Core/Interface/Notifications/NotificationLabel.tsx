import { useEffect, useRef, useState } from 'react'
import { dismissNotification, useNotification } from './notifications'
import { duration, ms } from '@pommora/uix/Animations/motion'
import { paneSlide } from '@pommora/uix/Animations/paneSlide'
import { ProgressBar, paintProgress } from '@pommora/uix/Elements/ProgressBar'
import { useHeld } from '@pommora/uix/Animations/useExitPresence'
import { cx } from '@pommora/uix/Utilities/cx'
import { Segments } from '@pommora/uix/Elements/Segments'
import * as s from './notification-label.css'
import { clamp } from '@pommora/uix/Utilities/clamp'
import { trackNear, withinBox } from '@pommora/uix/Interactions/hoverReveal'

const BASE_MS = ms(duration.base)
const MAX_STEP_MS = 100

export function NotificationLabel(): React.JSX.Element {
  const note = useNotification()
  const hostRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const nearRef = useRef(false)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (!note) {
      setShown(false)
      return
    }
    if (barRef.current) paintProgress(barRef.current, 1)
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
      if (barRef.current) paintProgress(barRef.current, remaining)
      if (remaining > 0) raf = requestAnimationFrame(tick)
      else setShown(false)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [note, shown])

  useEffect(() => {
    if (!note || shown) return
    const t = setTimeout(() => dismissNotification(note.id), BASE_MS)
    return () => clearTimeout(t)
  }, [note, shown])

  // Proximity rather than hover: the pointer heading for the action reaches the drain before it does, so the label can't leave out from under a reach. A press holds the drain where it stands.
  useEffect(() => {
    const host = hostRef.current
    if (!note || !shown || !host) return
    return trackNear({
      anchor: host,
      measure: () => {
        const box = host.getBoundingClientRect()
        return (x, y) => withinBox(box, x, y, s.NEAR_RADIUS)
      },
      report: (at) => {
        if (at !== 'held') nearRef.current = at === 'near'
      },
    }).stop
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
        <span className={s.message}>
          {held?.segment ? <Segments parts={[held.message, held.segment]} /> : held?.message}
        </span>
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
      <ProgressBar ref={barRef} fill={1} />
    </div>
  )
}
