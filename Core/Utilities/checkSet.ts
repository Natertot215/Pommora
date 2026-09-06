export function toggled<T>(prev: ReadonlySet<T>, key: T): ReadonlySet<T> {
  const next = new Set(prev)
  if (!next.delete(key)) next.add(key)
  return next
}

export function retained<T>(prev: ReadonlySet<T>, live: ReadonlySet<T>): ReadonlySet<T> {
  const next = new Set([...prev].filter((k) => live.has(k)))
  return next.size === prev.size ? prev : next
}
