export function toggled<T>(prev: ReadonlySet<T>, key: T): ReadonlySet<T> {
  const next = new Set(prev)
  if (!next.delete(key)) next.add(key)
  return next
}

export function retained<T>(prev: ReadonlySet<T>, live: ReadonlySet<T>): ReadonlySet<T> {
  const next = new Set([...prev].filter((k) => live.has(k)))
  return next.size === prev.size ? prev : next
}

function checkedIn<T, K>(checked: ReadonlySet<K>, shown: readonly T[], keyOf: (item: T) => K): T[] {
  return shown.filter((item) => checked.has(keyOf(item)))
}

/** What a right-click acts on: an unchecked item alone, whatever else is checked, since a checked set is a deliberate construction; a checked one with every checked item still shown, so a narrowed list never offers a batch of rows it hides, and a lone shown row keeps the single-row menu it is owed. */
export function actedOn<T, K>(
  checked: ReadonlySet<K>,
  shown: readonly T[],
  clicked: T,
  keyOf: (item: T) => K,
): T[] {
  return checked.has(keyOf(clicked)) ? checkedIn(checked, shown, keyOf) : [clicked]
}
