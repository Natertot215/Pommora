/** A splice pair hand-written per caller risks computing the destination index against the array it has already removed from. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = list.slice()
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/** `at` counts gaps in the list as it stands; a missing item (`from` -1) is made there. */
export function placeAt<T>(list: T[], from: number, at: number, make: () => T): T[] {
  if (from === -1) return [...list.slice(0, at), make(), ...list.slice(at)]
  const to = at > from ? at - 1 : at
  return to === from ? list : moveItem(list, from, to)
}

export function moveBefore<T>(
  list: T[],
  keyOf: (item: T) => string,
  key: string,
  beforeKey: string | null,
): T[] | null {
  const from = list.findIndex((i) => keyOf(i) === key)
  const at = beforeKey === null ? list.length : list.findIndex((i) => keyOf(i) === beforeKey)
  if (from === -1 || at === -1) return null
  const next = placeAt(list, from, at, () => list[from])
  return next === list ? null : next
}

export function nextOrder(
  current: readonly string[],
  draggedId: string,
  beforeId: string | null,
): string[] {
  const without = current.filter((id) => id !== draggedId)
  const found = beforeId ? without.indexOf(beforeId) : -1
  const at = beforeId ? (found === -1 ? without.length : found) : without.length
  return [...without.slice(0, at), draggedId, ...without.slice(at)]
}
