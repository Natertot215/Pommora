// No persisted order sorts by id ascending (ULIDs are time-sortable); a persisted array takes known-in-array-order with tombstones dropped, then appends the unreferenced by title.

import { compareTitles } from '../Paths/caseFold'
import { nextOrder, resolveRowOrder } from '@pommora/uix/Utilities/moveItem'
import type { CreateRequest } from './mutateRequest'
import type { Placement } from '../Settings/personalization'

interface Orderable {
  id: string
  title: string
}

export function resolveOrder<T extends Orderable>(items: T[], order: string[] | undefined): T[] {
  if (!order || order.length === 0) {
    // ULIDs are byte-order sortable by creation time; a title collator must not reshuffle them.
    return [...items].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  }

  const byTitle = [...items].sort((a, b) => compareTitles(a.title, b.title))
  return resolveRowOrder(byTitle, (i) => i.id, order)
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

export const placementSlot = (placement: Placement): Slot =>
  placement === 'top' ? 'first' : 'last'

// A parent the tree lacks leaves the request bare, since an order naming only the newborn would drop every sibling from the folder's order.
export function placedBeside<R extends CreateRequest>(
  req: R,
  siblingIds: string[] | undefined,
  anchorId: string | null,
  where: Slot,
): R {
  return siblingIds ? { ...req, order: spliceBeside(siblingIds, anchorId, req.id, where) } : req
}
