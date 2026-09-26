import { type RefObject, useEffect, useLayoutEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
const tabStops = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))

export function useFocusScope(
  ref: RefObject<HTMLElement | null>,
  open: boolean,
  { ready = true, initial = 'first' }: { ready?: boolean; initial?: 'first' | 'root' } = {},
): (e: React.KeyboardEvent<HTMLElement>) => void {
  const focusReturn = useRef<HTMLElement | null>(null)
  const tookFocus = useRef(false)
  useLayoutEffect(() => {
    if (!open) return
    const from = document.activeElement
    if (from instanceof HTMLElement && !ref.current?.contains(from)) focusReturn.current = from
  }, [open])

  useEffect(() => {
    const root = ref.current
    if (!open || !ready || !root || tookFocus.current) return
    tookFocus.current = true
    if (root.contains(document.activeElement)) return
    ;((initial === 'first' && tabStops(root)[0]) || root).focus()
  }, [open, ready, initial])

  useEffect(() => {
    if (!open) return
    return () => {
      tookFocus.current = false
      const back = focusReturn.current
      if (!back?.isConnected) return
      const active = document.activeElement
      if (active && active !== document.body && !ref.current?.contains(active)) return
      focusReturn.current = null
      back.focus({ preventScroll: true })
    }
  }, [open])

  return (e) => {
    if (e.key !== 'Tab' || e.ctrlKey || e.metaKey || e.altKey) return
    const root = ref.current
    if (!root) return
    const stops = tabStops(root)
    const edge = e.shiftKey ? stops[0] : stops[stops.length - 1]
    if (stops.length > 0 && document.activeElement !== edge && document.activeElement !== root)
      return
    e.preventDefault()
    ;(e.shiftKey ? stops[stops.length - 1] : stops[0])?.focus()
  }
}
