export function toggled<T>(prev: ReadonlySet<T>, key: T): ReadonlySet<T> {
  const next = new Set(prev)
  if (!next.delete(key)) next.add(key)
  return next
}

/** The checks that still name a listed row — the same set when none was lost. */
export function retained<T>(prev: ReadonlySet<T>, live: ReadonlySet<T>): ReadonlySet<T> {
  const next = new Set([...prev].filter((k) => live.has(k)))
  return next.size === prev.size ? prev : next
}
