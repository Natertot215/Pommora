import type { KeyboardEvent } from 'react'

/** Re-dispatches Enter/Space as a real click via `.click()`, so `onClick` gets a genuine
 *  MouseEvent through the same path. Pair with `role="button"` + `tabIndex={0}` on non-<button>
 *  elements. */
export function onActivateClick(e: KeyboardEvent<HTMLElement>): void {
  if (e.target !== e.currentTarget) return
  if (e.key !== 'Enter' && e.key !== ' ') return
  e.preventDefault()
  e.currentTarget.click()
}

export const onActivateKey =
  (run: () => void) =>
  (e: KeyboardEvent): void => {
    if (e.target !== e.currentTarget) return
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    run()
  }
