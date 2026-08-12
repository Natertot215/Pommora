// Order arrays for the writes that place a row: in-view creation, and a cross-location drop.
// Every array carries the full membership it governs — a partial write alphabetizes the
// untouched siblings, and one built from a filtered view permanently re-ranks every row the
// filter was hiding.

import { NEW_PAGE_SLOT } from '@shared/mutate'

/** `item` placed on the named side of `anchorId`, or appended when there's no anchor (null) or
 *  the anchor isn't present. */
export function spliceBeside(
  ids: string[],
  anchorId: string | null,
  item: string,
  where: 'above' | 'below',
): string[] {
  const at = anchorId === null ? -1 : ids.indexOf(anchorId)
  if (at === -1) return [...ids, item]
  const insert = where === 'below' ? at + 1 : at
  return [...ids.slice(0, insert), item, ...ids.slice(insert)]
}

/** The parent container's `page_order` with the new page's slot spliced beside its anchor
 *  (or appended when the anchor isn't among the siblings). `siblingIds` is the container's own
 *  full child list, in current resolved order. */
export function orderWithSlot(
  siblingIds: string[],
  anchorId: string | null,
  where: 'above' | 'below' | 'last',
): string[] {
  const ids = siblingIds.filter((id) => id !== NEW_PAGE_SLOT)
  if (where === 'last' || anchorId === null) return [...ids, NEW_PAGE_SLOT]
  return spliceBeside(ids, anchorId, NEW_PAGE_SLOT, where)
}

/** The full `viewOrders` tiebreaker array with `newId` placed beside its anchor. Reproduces the
 *  current ranking exactly — the existing array first, then every id absent from it in source
 *  order (absent rows rank last, stable) — so no row moves but the one being placed. */
/** The current ranking reproduced exactly — the existing array first, then every id absent from
 *  it in source order (absent rows rank last, stable), the placed id excluded throughout. */
function mergedRanking(
  existing: string[] | undefined,
  allIds: string[],
  excludeId: string,
): string[] {
  const base = existing ?? []
  const inBase = new Set(base)
  return [
    ...base.filter((id) => id !== excludeId),
    ...allIds.filter((id) => !inBase.has(id) && id !== excludeId),
  ]
}

export function tieOrderWith(
  existing: string[] | undefined,
  allIds: string[],
  newId: string,
  anchorId: string,
  where: 'above' | 'below',
): string[] {
  return spliceBeside(mergedRanking(existing, allIds, newId), anchorId, newId, where)
}

/** The full tiebreaker array with `newId` ranked last — a band-add's "end of the group", since
 *  banding partitions before the manual order ranks. */
export function appendOrderWith(
  existing: string[] | undefined,
  allIds: string[],
  newId: string,
): string[] {
  return [...mergedRanking(existing, allIds, newId), newId]
}
