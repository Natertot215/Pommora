import { useRef } from 'react'

/** The last value from while a surface was live, so it can paint through its own exit. Content is
 *  built from the state that opened a surface, and dismissing usually clears that state in the same
 *  tick — a surface that let go would retract empty, collapsing as it fades. The companion to
 *  `useExitPresence`: that one keeps the surface mounted, this one keeps what it draws. */
export function useHeld<T>(value: T, live: boolean): T {
  const held = useRef(value)
  if (live) held.current = value
  return held.current
}
