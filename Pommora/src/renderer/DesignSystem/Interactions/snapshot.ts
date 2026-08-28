// The measure-once discipline every drag surface shares: geometry is taken when a drag first asks,
// held frozen — never a rect read per pointer move — and re-taken lazily after an invalidating
// event (scroll, list change, spring-open). The invariant consumers must keep: an invalidation
// RE-RESOLVES from the last pointer point, and the drop consults `isDirty` before reading its
// slot, so a commit is never built against geometry that moved.

import { useRef, useState } from 'react'

export function useDragSnapshot<T>(take: () => T | null): {
  /** The current snapshot — re-taken when dirty or empty. A null take (a ref not yet attached)
   *  is returned but never cached, so the next get retries. */
  get: () => T | null
  markDirty: () => void
  isDirty: () => boolean
  /** Drop the snapshot entirely — the gesture ended. */
  reset: () => void
} {
  const takeRef = useRef(take)
  takeRef.current = take
  const snap = useRef<T | null>(null)
  const dirty = useRef(false)
  const [api] = useState(() => ({
    get: (): T | null => {
      if (dirty.current || snap.current === null) {
        const next = takeRef.current()
        if (next === null) return null
        snap.current = next
        dirty.current = false
      }
      return snap.current
    },
    markDirty: (): void => {
      dirty.current = true
    },
    isDirty: (): boolean => dirty.current,
    reset: (): void => {
      snap.current = null
      dirty.current = false
    },
  }))
  return api
}
