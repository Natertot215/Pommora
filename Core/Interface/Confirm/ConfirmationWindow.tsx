import { useCallback, useEffect, useRef } from 'react'
import { useSession } from '../../Session/store'
import { Button } from '@pommora/uix/Buttons/Button'
import { GlassWindow } from '@pommora/uix/Glass/glass-window'
import { ModalScrim } from '@pommora/uix/Windows/ModalScrim'
import * as s from './confirmation-window.css'

export function ConfirmationWindow(): React.JSX.Element | null {
  const pending = useSession((st) => st.pendingConfirm)
  const open = pending !== null
  const panelRef = useRef<HTMLDivElement>(null)
  const settleRef = useRef(pending?.settle)
  settleRef.current = pending?.settle
  const defaultRef = useRef(false)
  defaultRef.current = pending?.req.defaultsToCancel === true

  const focusPanel = useCallback((el: HTMLDivElement | null) => {
    panelRef.current = el
    el?.focus()
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.defaultPrevented) return
      // A focused button answers through its own activation; taking Enter here too would answer twice.
      const onButton =
        document.activeElement instanceof HTMLButtonElement &&
        panelRef.current?.contains(document.activeElement) === true
      if (e.key === 'Enter' && !onButton) {
        e.preventDefault()
        settleRef.current?.(!defaultRef.current)
      }
    }
    // Capture, so the question answers before the surface underneath consumes the key — the editor behind the scrim would otherwise take Return for a newline.
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [open])

  return (
    <ModalScrim open={open} dismiss={() => settleRef.current?.(false)}>
      {pending && (
        <GlassWindow
          ref={focusPanel}
          className={s.panel}
          role="alertdialog"
          aria-modal="true"
          aria-label={pending.req.message}
          tabIndex={-1}
        >
          <div className={s.body}>
            <span className={s.message}>{pending.req.message}</span>
            <span className={s.detail}>{pending.req.detail}</span>
          </div>
          <div className={s.actions}>
            <Button type="filled" label="Cancel" onClick={() => pending.settle(false)} />
            <Button
              type={pending.req.tone === 'positive' ? 'tinted' : 'destructive'}
              label={pending.req.action}
              onClick={() => pending.settle(true)}
            />
          </div>
        </GlassWindow>
      )}
    </ModalScrim>
  )
}
