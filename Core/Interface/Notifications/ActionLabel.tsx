import { useEffect, useRef, useState } from 'react'
import { dismissNotification, useActionBar, useNotification } from './notifications'
import { duration, ms } from '@pommora/uix/Animations/motion'
import { paneSlide } from '@pommora/uix/Animations/paneSlide'
import { Swap } from '@pommora/uix/Animations/Swap'
import { Button } from '@pommora/uix/Buttons/Button'
import { ProgressBar, paintProgress } from '@pommora/uix/Elements/ProgressBar'
import { useHeld } from '@pommora/uix/Animations/useExitPresence'
import { cx } from '@pommora/uix/Utilities/cx'
import { Segments } from '@pommora/uix/Elements/Segments'
import * as s from './action-label.css'
import { clamp } from '@pommora/uix/Utilities/clamp'
import { trackNear, withinBox } from '@pommora/uix/Interactions/hoverReveal'

const BASE_MS = ms(duration.base)
const MAX_STEP_MS = 100

export function ActionLabel(): React.JSX.Element {
  const note = useNotification()
  const bar = useActionBar()
  const hostRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLSpanElement>(null)
  const nearRef = useRef(false)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (!note) {
      setShown(false)
      return
    }
    if (progressRef.current) paintProgress(progressRef.current, 1)
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
      if (progressRef.current) paintProgress(progressRef.current, remaining)
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

  // Proximity rather than hover: the pointer heading for the action reaches the drain before it does, so the label can't leave out from under a reach. A press holds the drain where it stands. A notice stays unarmed until the pointer has been seen outside its band once, since the press that posted it can leave the pointer inside; one posted with the pointer on the label itself, as a press of the bar's own leaves it, arms at once.
  useEffect(() => {
    const host = hostRef.current
    if (!note || !shown || !host) return
    let armed = host.matches(':hover')
    return trackNear({
      anchor: host,
      measure: () => {
        const box = host.getBoundingClientRect()
        return (x, y) => withinBox(box, x, y, s.NEAR_RADIUS)
      },
      report: (at) => {
        if (at === 'held') return
        armed ||= at !== 'near'
        nearRef.current = armed && at === 'near'
      },
    }).stop
  }, [note, shown])

  const face = note && shown ? 'notice' : bar ? 'bar' : null
  const open = face !== null
  // Held so the label paints its own exit, and cross-fades between faces, instead of retracting or fading to an empty one.
  const held = useHeld(note, note !== null)
  const heldBar = useHeld(bar, bar !== null)
  const heldFace = useHeld(face, open)
  const error = heldFace === 'notice' && held?.tone === 'error'

  return (
    <div
      ref={hostRef}
      className={cx(s.host, paneSlide({ side: 'right', mode: 'overlay', open }), error && s.error)}
      role={error ? 'alert' : 'status'}
      inert={!open}
    >
      <Swap
        className={s.faces}
        swapped={heldFace === 'notice'}
        from={
          heldBar && (
            <span className={s.row}>
              <span className={s.message}>
                <Segments
                  parts={[
                    <Button
                      key="restore"
                      type="filled"
                      size="button-inline"
                      label="Restore"
                      onClick={heldBar.restore}
                    />,
                    heldBar.count,
                  ]}
                />
              </span>
              <Button
                type="destructive"
                size="button-inline"
                icon="trash"
                iconSize="body"
                title="Delete"
                onClick={heldBar.remove}
              />
            </span>
          )
        }
        to={
          <span className={s.face}>
            <span className={s.row}>
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
            </span>
            <ProgressBar ref={progressRef} fill={1} />
          </span>
        }
      />
    </div>
  )
}
