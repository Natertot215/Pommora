import { useEffect, useMemo, useRef, useState } from 'react'
import { useLatest } from '@pommora/uix/Utilities/stableApi'
import { knownBody } from '../../Session/pageDetailCache'
import type { SubfieldPage } from './subfieldItems'

// Live stats settle just behind the keystroke so a long page isn't Markdown-scanned on every char.
const STATS_DEBOUNCE_MS = 120

export function useSettledBody<T>(
  sink: (value: T) => void,
  flushOnUnmount = false,
): { push: (value: T, now?: boolean) => void; cancel: () => void } {
  const sinkRef = useLatest(sink)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pending = useRef<{ value: T } | null>(null)
  useEffect(
    () => () => {
      clearTimeout(timer.current)
      if (flushOnUnmount && pending.current) sinkRef.current(pending.current.value)
    },
    [],
  )
  return useMemo(() => {
    const cancel = (): void => {
      clearTimeout(timer.current)
      pending.current = null
    }
    const push = (value: T, now = false): void => {
      cancel()
      if (now) {
        sinkRef.current(value)
        return
      }
      pending.current = { value }
      timer.current = setTimeout(() => {
        pending.current = null
        sinkRef.current(value)
      }, STATS_DEBOUNCE_MS)
    }
    return { push, cancel }
  }, [])
}

/** A floating window's bar reads the body its own tile streams, since the window holds a page the main pane never shows. A path's first body lands at once, the edits behind it settle, and a path the tile hasn't reported yet reads the body already in memory, so a parked tab shows its figures on return. */
export function useSubfieldPage(target: { id: string; path: string } | null): {
  page: SubfieldPage | null
  onBody: (body: string) => void
} {
  const path = target?.path ?? null
  const [held, setHeld] = useState<{ path: string | null; body: string }>({ path: null, body: '' })
  const settle = useSettledBody(setHeld)
  if (held.path !== null && held.path !== path) {
    settle.cancel()
    setHeld({ path: null, body: '' })
  }
  const onBody = (body: string): void => settle.push({ path, body }, held.path !== path)
  const body = held.path === path ? held.body : path ? (knownBody(path) ?? '') : ''
  const page = useMemo<SubfieldPage | null>(
    () => (target ? { target: { kind: 'page', id: target.id, path: target.path }, body } : null),
    [target?.id, target?.path, body],
  )
  return { page, onBody }
}
