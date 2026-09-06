import type { KeyboardEvent } from 'react'

/** Re-dispatches Enter/Space through `.click()` so `onClick` gets a genuine MouseEvent. Pair with `role="button"` + `tabIndex={0}`. */
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
