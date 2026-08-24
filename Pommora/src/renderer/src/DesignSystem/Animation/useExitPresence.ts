import { useEffect, useState } from 'react'
import { duration, ms } from './motion'

// `exitMs` must cover the slowest close animation — the default gives the menu Bloom (duration.slow)
// slack; the picker/autocomplete `dropdown` token is covered by the same window.
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
