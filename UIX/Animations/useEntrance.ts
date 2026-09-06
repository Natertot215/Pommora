import { useRef } from 'react'

const sameKeys = (a: ReadonlySet<string>, b: ReadonlySet<string>): boolean =>
  a.size === b.size && [...a].every((k) => b.has(k))

/** Keyed rather than array-identity, so a list rebuilt every render (and a StrictMode double-pass) reports an arrival exactly once; `ready` holds the seed open for a list whose data lands a render behind its mount. */
export function useEntrance<T>(
  items: readonly T[],
  keyOf: (item: T, index: number) => string,
  ready = true,
): (key: string) => boolean {
  const keys = new Set(items.map(keyOf))
  const seen = useRef<{ prev: ReadonlySet<string>; cur: ReadonlySet<string>; ready: boolean }>(null)
  if (seen.current === null || !ready || !seen.current.ready)
    seen.current = { prev: keys, cur: keys, ready }
  else if (!sameKeys(seen.current.cur, keys))
    seen.current = { prev: seen.current.cur, cur: keys, ready }
  const { prev } = seen.current
  return (key) => !prev.has(key)
}
