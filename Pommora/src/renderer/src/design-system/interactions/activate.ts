import type { KeyboardEvent } from 'react'

/**
 * The keyboard half of a click surface. Enter and Space re-dispatch as a real click, so the
 * element's own `onClick` runs with a genuine MouseEvent — same propagation, same currentTarget,
 * no second code path to keep in sync. Pair with `role="button"` and `tabIndex={0}` on any
 * element that isn't a real `<button>`.
 */
export function onActivateClick(e: KeyboardEvent<HTMLElement>): void {
  if (e.key !== 'Enter' && e.key !== ' ') return
  e.preventDefault()
  e.currentTarget.click()
}

/** The same contract where the action is a plain callback rather than the element's own onClick. */
export const onActivateKey =
  (run: () => void) =>
  (e: KeyboardEvent): void => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    run()
  }
