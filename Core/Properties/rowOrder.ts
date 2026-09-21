export function resolveRowOrder<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
  listed: readonly string[] = [],
): T[] {
  const byKey = new Map(items.map((i) => [keyOf(i), i]))
  const first = listed.flatMap((k) => {
    const hit = byKey.get(k)
    if (hit) byKey.delete(k)
    return hit ? [hit] : []
  })
  return [...first, ...byKey.values()]
}
