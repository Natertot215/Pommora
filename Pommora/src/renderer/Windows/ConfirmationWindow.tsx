import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useSession } from '@renderer/store'
import { Button } from '@renderer/DesignSystem/Buttons'
import { GlassWindow } from '@renderer/DesignSystem/Glass'
import { useHeldPresence, windowIn, windowOut } from '@renderer/Animation'
import { markPickerOpen } from '@renderer/Interactions/useDismiss'
import { cx } from '@renderer/DesignSystem/Util/cx'
import * as s from './confirmation-window.css'

export function ConfirmationWindow(): React.JSX.Element | null {
  const pending = useSession((st) => st.pendingConfirm)
  const shown = useHeldPresence(pending)
  // The held value only once the panel is actually in the DOM — the presence hook mounts a render
  // late, so keying the effects on `pending` would focus a panel that does not exist yet.
  const active = shown && !shown.closing ? shown.held : null
  const panelRef = useRef<HTMLDivElement>(null)
  const settleRef = useRef(pending?.settle)
  settleRef.current = pending?.settle
  const defaultRef = useRef(false)
  defaultRef.current = pending?.req.defaultsToCancel === true

  useEffect(() => {
    if (!active) return
    panelRef.current?.focus()
    return markPickerOpen()
  }, [active])

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.defaultPrevented) return
      if (e.key === 'Escape') {
        e.preventDefault()
        settleRef.current?.(false)
        return
      }
      // A focused button answers through its own activation; taking Enter here too would answer
      // twice. The panel itself holding focus is the resting state, and does take it.
      const onButton =
        document.activeElement instanceof HTMLButtonElement &&
        panelRef.current?.contains(document.activeElement) === true
      if (e.key === 'Enter' && !onButton) {
        e.preventDefault()
        settleRef.current?.(!defaultRef.current)
      }
    }
    // Capture, so the question answers before the surface underneath consumes the key — a scrim
    // stops pointers, and the editor behind it would otherwise take Return for a newline.
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [active])

  if (!shown) return null
  const { req, settle } = shown.held
  const closing = shown.closing

  return createPortal(
    // biome-ignore lint/a11y/noStaticElementInteractions lint/a11y/useKeyWithClickEvents: a modal scrim, not a control — it swallows the portal's own pointer events and cancels on an outside click; Escape is the keyboard dismissal.
    <div
      className={cx(s.backdrop, closing && s.backdropClosing)}
      inert={closing}
      onPointerDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        if (e.target === e.currentTarget) settle(false)
      }}
    >
      <GlassWindow
        ref={panelRef}
        className={cx(s.panel, closing ? windowOut : windowIn)}
        role="alertdialog"
        aria-modal="true"
        aria-label={req.message}
        tabIndex={-1}
      >
        <div className={s.body}>
          <span className={s.message}>{req.message}</span>
          <span className={s.detail}>{req.detail}</span>
        </div>
        <div className={s.actions}>
          <Button type="filled" label="Cancel" onClick={() => settle(false)} />
          <Button
            type={req.tone === 'positive' ? 'tinted' : 'destructive'}
            label={req.action}
            onClick={() => settle(true)}
          />
        </div>
      </GlassWindow>
    </div>,
    document.body,
  )
}
