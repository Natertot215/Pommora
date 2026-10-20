// No persisted order sorts by id ascending (ULIDs are time-sortable); a persisted array takes known-in-array-order with tombstones dropped, then appends the unreferenced by title.

import { compareTitles } from '../Paths/caseFold'
import { nextOrder } from '@pommora/uix/Utilities/moveItem'

interface Orderable {
  id: string
  title: string
}

export function resolveOrder<T extends Orderable>(items: T[], order: string[] | undefined): T[] {
  if (!order || order.length === 0) {
    // ULIDs are byte-order sortable by creation time; a title collator must not reshuffle them.
    return [...items].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
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

export type Slot = 'above' | 'below' | 'first' | 'last'

export function spliceBeside(
  ids: string[],
  anchorId: string | null,
  item: string,
  where: Slot,
): string[] {
  const at = anchorId === null ? -1 : ids.indexOf(anchorId)
  const before =
    where === 'first'
      ? (ids[0] ?? null)
      : where === 'above'
        ? anchorId
        : where === 'below' && at >= 0
          ? (ids[at + 1] ?? null)
          : null
  return nextOrder(ids, item, before)
}
