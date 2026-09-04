import { useCallback } from 'react'

/** Keeps the active row inside its scroller as the selection moves. The returned ref goes on
 *  whichever element is currently active; its identity changes only with `active`, so the scroll
 *  runs on the move rather than on every render. */
export function useKeepInView(active: unknown): (el: HTMLElement | null) => void {
  return useCallback(
    (el: HTMLElement | null) => el?.scrollIntoView({ inline: 'nearest', block: 'nearest' }),
    [active],
  )
}
