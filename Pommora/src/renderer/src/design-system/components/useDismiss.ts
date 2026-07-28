import { useEffect, type RefObject } from 'react'

/** Scope `ref` to include the trigger itself — otherwise a click that re-toggles it also reads
 *  as an outside click and double-fires the close. */
export function useDismiss(
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
  active: boolean,
): void {
  useEffect(() => {
    if (!active) return
    const onDown = (e: PointerEvent): void => {
      // Right/middle presses open menus, not dismiss. A native menu also returns input
      // asynchronously, so the press that closes IT can land here as a stray outside click.
      if (e.button !== 0) return
      const target = e.target as Element
      // A portal'd picker renders OUTSIDE this ref in the DOM, so a plain containment check reads
      // it as "outside" and dismisses the host it visually sits within — spare the marked portal.
      if (ref.current && !ref.current.contains(target) && !target.closest?.('[data-picker-portal]'))
        onClose()
    }
    const onKey = (e: KeyboardEvent): void => {
      // A marked picker portal owns its own Escape — while one's open, it closes itself and this host
      // stays put (Escape peels one popover at a time, never the pane out from under the picker in it).
      if (e.key === 'Escape' && !document.querySelector('[data-picker-portal]')) onClose()
    }
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [ref, onClose, active])
}
