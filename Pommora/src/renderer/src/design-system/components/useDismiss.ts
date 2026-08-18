import { useEffect, type RefObject } from 'react'

// A portal'd picker renders OUTSIDE its host's ref, so containment alone would read a click in
// one as "outside" and dismiss the host it visually sits within. Pickers report their presence
// here instead of being searched for in the DOM.
let openPickers = 0

/** PickerMenu holds this for its portal's whole mounted window — Bloom-out included, so the
 *  closing pane still shields its host. Returns the release. */
export function markPickerOpen(): () => void {
  openPickers++
  let released = false
  return () => {
    if (released) return
    released = true
    openPickers--
  }
}

/** Scope `ref` to include the trigger itself — otherwise a click that re-toggles it also reads
 *  as an outside click and double-fires the close. Pass `outsideClick: false` for a host that
 *  should persist through a click elsewhere (e.g. the outline, left open for live reference) —
 *  Escape and the trigger's own toggle stay its only dismissals. */
export function useDismiss(
  ref: RefObject<HTMLElement | null>,
  onClose: () => void,
  active: boolean,
  outsideClick = true,
): void {
  useEffect(() => {
    if (!active) return
    const onDown = (e: PointerEvent): void => {
      // Right/middle presses open menus, not dismiss. A native menu also returns input
      // asynchronously, so the press that closes IT can land here as a stray outside click.
      if (e.button !== 0) return
      const target = e.target as Element
      // While a picker is up, its backdrop owns every outside click — the host under it stays.
      if (ref.current && !ref.current.contains(target) && openPickers === 0) onClose()
    }
    const onKey = (e: KeyboardEvent): void => {
      // An open picker owns its own Escape — it closes itself and this host stays put (Escape
      // peels one popover at a time, never the pane out from under the picker in it).
      if (e.key === 'Escape' && openPickers === 0) onClose()
    }
    if (outsideClick) document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      if (outsideClick) document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [ref, onClose, active, outsideClick])
}
