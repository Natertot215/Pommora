// No persisted order sorts by id ascending (ULIDs are time-sortable); a persisted array takes known-in-array-order with tombstones dropped, then appends the unreferenced by title.

interface Orderable {
  id: string
  title: string
}

/** `fallback` picks 'id' (ULID = creation order) or 'title', for adopted entities whose ids are hashes. */
export function resolveOrder<T extends Orderable>(
  items: T[],
  order: string[] | undefined,
  fallback: 'id' | 'title' = 'id',
): T[] {
  if (!order || order.length === 0) {
    return [...items].sort((a, b) =>
      fallback === 'title' ? a.title.localeCompare(b.title) : a.id.localeCompare(b.id),
    )
  }

  const byId = new Map(items.map((i) => [i.id, i]))
  const known: T[] = []
  for (const id of order) {
    const it = byId.get(id)
    if (it) {
      known.push(it)
      byId.delete(id)
    }
  }
  const rest = [...byId.values()].sort((a, b) => a.title.localeCompare(b.title))
  return [...known, ...rest]
}
