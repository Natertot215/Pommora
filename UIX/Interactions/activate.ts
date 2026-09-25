import type { KeyboardEvent } from 'react'

/** Enter/Space on the element itself runs `run` with it. Pair with `role="button"` + `tabIndex={0}`. */
export const onActivateKey =
  (run: (el: HTMLElement) => void) =>
  (e: KeyboardEvent<HTMLElement>): void => {
    if (e.target !== e.currentTarget) return
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    run(e.currentTarget)
  }

/** Re-dispatches Enter/Space through `.click()` so `onClick` gets a genuine MouseEvent. */
export const onActivateClick = onActivateKey((el) => el.click())
