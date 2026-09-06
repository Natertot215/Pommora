import { useRef } from 'react'

/** The last live value, so a surface paints through its own exit: dismissing clears the state that built its content in the same tick, and it would retract empty. */
export function useHeld<T>(value: T, live: boolean): T {
  const held = useRef(value)
  if (live) held.current = value
  return held.current
}
