import { useEffect, useRef, useState } from 'react'
import { duration, ms } from './motion'

// `exitMs` must cover the slowest close animation; the default gives the menu Bloom slack.
const EXIT_SLACK_MS = 30
export function useExitPresence(
  open: boolean,
  exitMs = ms(duration.slow) + EXIT_SLACK_MS,
): { mounted: boolean; closing: boolean } {
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)
  useEffect(() => {
    if (open) {
      setMounted(true)
      setClosing(false)
      return
    }
    if (!mounted) return
    setClosing(true)
    const t = setTimeout(() => {
      setMounted(false)
      setClosing(false)
    }, exitMs)
    return () => clearTimeout(t)
  }, [open, mounted, exitMs])
  return { mounted, closing }
}

/** The last live value, so a surface paints through its own exit: dismissing clears the state that built its content in the same tick, and it would retract empty. */
export function useHeld<T>(value: T, live: boolean): T {
  const held = useRef(value)
  if (live) held.current = value
  return held.current
}

/** A value kept through its exit animation: the store nulls it at close, this renders the last. */
export function useHeldPresence<T>(
  value: T | null,
  open: boolean = value !== null,
): { held: T; closing: boolean } | null {
  const { mounted, closing } = useExitPresence(open)
  const held = useHeld(value, value !== null)
  return mounted && held !== null ? { held, closing } : null
}
