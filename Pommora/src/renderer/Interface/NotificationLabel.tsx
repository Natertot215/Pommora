import { useEffect, useRef, useState } from 'react'
import { useSession } from '@renderer/store'
import { duration, ms, useExitPresence } from '@renderer/DesignSystem/Animation'
import { cx } from '@renderer/DesignSystem/Util/cx'
import * as s from './notification-label.css'

export function NotificationLabel(): React.JSX.Element | null {
  const note = useSession((st) => st.notification)
  const dismiss = useSession((st) => st.dismissNotification)
  const hostRef = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(false)
  const [open, setOpen] = useState(false)
  const { mounted, closing } = useExitPresence(open, ms(duration.base))

  useEffect(() => {
    setOpen(note !== null)
    setNear(false)
  }, [note?.id, note])

  useEffect(() => {
    if (note && !mounted) dismiss(note.id)
  }, [note, mounted, dismiss])

  // Proximity rather than hover: the pointer heading for the action pauses the drain before it
  // arrives, so the row can't leave out from under a reach.
  useEffect(() => {
    if (!note) return
    let rect: DOMRect | null = null
    const onMove = (e: PointerEvent): void => {
      const el = hostRef.current
      if (!el) return
      if (!rect) rect = el.getBoundingClientRect()
      const r = s.NEAR_RADIUS
      setNear(
        e.clientX > rect.left - r &&
          e.clientX < rect.right + r &&
          e.clientY > rect.top - r &&
          e.clientY < rect.bottom + r,
      )
    }
    const drop = (): void => {
      rect = null
    }
    document.addEventListener('pointermove', onMove)
    window.addEventListener('resize', drop)
    return () => {
      document.removeEventListener('pointermove', onMove)
      window.removeEventListener('resize', drop)
    }
  }, [note])

  if (!note || !mounted) return null

  return (
    <div
      ref={hostRef}
      className={cx(s.host, note.tone === 'error' && s.error, closing && s.leaving)}
      role={note.tone === 'error' ? 'alert' : 'status'}
    >
      <div className={s.row}>
        <span className={s.message}>{note.message}</span>
        {note.action ? (
          <button
            type="button"
            className={s.action}
            onClick={() => {
              void note.action?.run()
              setOpen(false)
            }}
          >
            {note.action.label}
          </button>
        ) : null}
      </div>
      <div className={s.track}>
        <div className={cx(s.fill, near && s.paused)} onAnimationEnd={() => setOpen(false)} />
      </div>
    </div>
  )
}
