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

export function moveByKey<T>(
  list: T[],
  keyOf: (item: T) => string,
  activeKey: string,
  overKey: string,
): T[] | null {
  const from = list.findIndex((i) => keyOf(i) === activeKey)
  const to = list.findIndex((i) => keyOf(i) === overKey)
  if (from === -1 || to === -1 || from === to) return null
  return moveItem(list, from, to)
}
