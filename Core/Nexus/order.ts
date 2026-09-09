// No persisted order sorts by id ascending (ULIDs are time-sortable); a persisted array takes known-in-array-order with tombstones dropped, then appends the unreferenced by title.

import { compareTitles } from '../Paths/caseFold'

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
    return [...items].sort((a, b) => {
      if (fallback === 'title') return compareTitles(a.title, b.title)
      // ULIDs are byte-order sortable by creation time; a title collator must not reshuffle them.
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
    })
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
  const rest = [...byId.values()].sort((a, b) => compareTitles(a.title, b.title))
  return [...known, ...rest]
}
