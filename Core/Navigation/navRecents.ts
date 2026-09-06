import { toNavRef } from '@pommora/core/Navigation/navRef'
import type { NavRef, SelectTarget } from '@pommora/core/Navigation/navRef'
import { moveItem } from '@pommora/uix/Utilities/moveItem'

export const RECENTS_CAP = 100

export function navKey(t: NavRef | SelectTarget): string {
  return 'id' in t ? `${t.kind}:${t.id}` : t.kind
}

export function recordRecent(
  recents: NavRef[],
  target: NavRef | SelectTarget,
  cap = RECENTS_CAP,
): NavRef[] {
  const ref = toNavRef(target)
  const key = navKey(ref)
  return capRecents([ref, ...recents.filter((r) => navKey(r) !== key)], cap)
}

function capRecents(recents: NavRef[], cap: number): NavRef[] {
  return recents.length <= cap ? recents : recents.slice(0, cap)
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

export function removeRecentByKey(recents: NavRef[], key: string): NavRef[] {
  const next = recents.filter((r) => navKey(r) !== key)
  return next.length === recents.length ? recents : next
}
