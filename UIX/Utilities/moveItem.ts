/** A splice pair hand-written per caller risks computing the destination index against the array it has already removed from. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = list.slice()
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}
