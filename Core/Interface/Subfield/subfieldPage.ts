import { useEffect, useMemo, useRef, useState } from 'react'
import type { SubfieldPage } from './subfieldItems'

const STATS_DEBOUNCE_MS = 120

/** A floating window's bar reads the body its own tile streams, since the window holds a page the main pane never shows. The figures settle just behind the keystroke. */
export function useSubfieldPage(target: { id: string; path: string } | null): {
  page: SubfieldPage | null
  onBody: (body: string) => void
} {
  const [bodyText, setBodyText] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const seededPath = useRef<string | null>(null)
  const path = target?.path ?? null
  useEffect(() => {
    setBodyText('')
    clearTimeout(timer.current)
  }, [path])
  useEffect(
    () => () => {
      clearTimeout(timer.current)
    },
    [],
  )
  const onBody = (body: string): void => {
    clearTimeout(timer.current)
    // The first body for a path seats at once; only the edits behind it wait out the pause.
    if (seededPath.current !== path) {
      seededPath.current = path
      setBodyText(body)
      return
    }
    timer.current = setTimeout(() => setBodyText(body), STATS_DEBOUNCE_MS)
  }
  const page = useMemo<SubfieldPage | null>(
    () =>
      target
        ? { target: { kind: 'page', id: target.id, path: target.path }, body: bodyText }
        : null,
    [target?.id, target?.path, bodyText],
  )
  return { page, onBody }
}
