import { useEffect, useRef, useState } from 'react'
import { duration, ms } from './motion'
import { SETTLE_FALLBACK } from '../Interactions/shared'

type Exit = keyof typeof duration
export const exitWait = (exit: Exit): number => ms(duration[exit]) + 30

export function useExitPresence(open: boolean, exit: Exit): { mounted: boolean; closing: boolean } {
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
    }, exitWait(exit))
    return () => clearTimeout(t)
  }, [open, mounted, exit])
  return { mounted, closing }
}

/** Settles once per pending stretch, on the end event or after `exit` plus slack, whichever comes first: a transition that never runs never ends. */
export function useSettleFallback(pending: boolean, exit: Exit, settle: () => void): () => void {
  const latest = useRef(settle)
  latest.current = settle
  const armed = useRef(false)
  const once = useRef(() => {
    if (!armed.current) return
    armed.current = false
    latest.current()
  }).current
  useEffect(() => {
    armed.current = pending
    if (!pending) return
    const t = setTimeout(once, ms(duration[exit]) + SETTLE_FALLBACK)
    return () => clearTimeout(t)
  }, [pending, exit, once])
  return once
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
  exit: Exit,
  open: boolean = value !== null,
): { held: T; closing: boolean } | null {
  const { mounted, closing } = useExitPresence(open, exit)
  const held = useHeld(value, value !== null)
  return mounted && held !== null ? { held, closing } : null
}
