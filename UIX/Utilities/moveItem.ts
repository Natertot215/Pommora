/** A splice pair hand-written per caller risks computing the destination index against the array it has already removed from. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = list.slice()
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
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
