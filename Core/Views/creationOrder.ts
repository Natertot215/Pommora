// Every array carries the full membership it governs — a partial write alphabetizes the untouched siblings, and one built from a filtered view permanently re-ranks every row the filter was hiding.

import { NEW_PAGE_SLOT } from '@pommora/core/Nexus/mutateRequest'

export const sameIds = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((x, i) => x === b[i])

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

export function orderWithSlot(
  siblingIds: string[],
  anchorId: string | null,
  where: 'above' | 'below' | 'last',
): string[] {
  const ids = siblingIds.filter((id) => id !== NEW_PAGE_SLOT)
  if (where === 'last' || anchorId === null) return [...ids, NEW_PAGE_SLOT]
  return spliceBeside(ids, anchorId, NEW_PAGE_SLOT, where)
}

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
  anchorId: string | null,
  where: 'above' | 'below',
): string[] {
  return spliceBeside(mergedRanking(existing, allIds, newId), anchorId, newId, where)
}
