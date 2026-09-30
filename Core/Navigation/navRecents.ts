import { navKey, toNavRef, type NavRef, type SelectTarget } from './navRef'

export const RECENTS_CAP = 100

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

export function removeRecentByKey(recents: NavRef[], key: string): NavRef[] {
  const next = recents.filter((r) => navKey(r) !== key)
  return next.length === recents.length ? recents : next
}
