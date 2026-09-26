import { type ReactNode, useRef } from 'react'
import { createPortal } from 'react-dom'
import { windowIn, windowOut } from '../Animations/animations.css'
import { useExitPresence, useHeld } from '../Animations/useExitPresence'
import { useDismissal } from '../Interactions/dismissalStack'
import { useFocusScope } from '../Interactions/focusScope'
import { cx } from '../Utilities/cx'
import * as s from './modal-scrim.css'

/** The shared modal overlay: a portal to the body, a scrim that swallows its own pointer events, dismissal wiring, a focus scope that keeps Tab inside and returns focus on close, and the window motion both the scrim and its panel leave on. The panel is held through the exit so its content paints while it fades. */
export function ModalScrim({
  open,
  dismiss,
  children,
}: {
  open: boolean
  dismiss: () => void
  children?: ReactNode
}): React.JSX.Element | null {
  const wrapRef = useRef<HTMLDivElement>(null)
  const { mounted, closing } = useExitPresence(open, 'fast')
  const held = useHeld(children, open)
  useDismissal(mounted && !closing, false, { layer: () => wrapRef.current, dismiss })
  const trapTab = useFocusScope(wrapRef, open, { ready: mounted, initial: 'root' })
  if (!mounted) return null

  return createPortal(
    // biome-ignore lint/a11y/noStaticElementInteractions: a modal scrim, not a control — it swallows the portal's own pointer events; the dismissal stack owns the outside press and Escape.
    // biome-ignore lint/a11y/useKeyWithClickEvents: a modal scrim, not a control — it swallows the portal's own pointer events; the dismissal stack owns the outside press and Escape.
    <div
      className={cx(s.backdrop, closing && s.backdropClosing)}
      inert={closing}
      onPointerDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: a focus scope, not a control — it keeps Tab inside the modal */}
      <div
        ref={wrapRef}
        className={cx(s.frame, closing ? windowOut : windowIn)}
        tabIndex={-1}
        onKeyDown={trapTab}
      >
        {held}
      </div>
    </div>,
    document.body,
  )
}
