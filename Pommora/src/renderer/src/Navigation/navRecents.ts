// Pure recents-stream logic for the Navigation layer. Storage is a plain MRU list of bare refs
// (newest first) — durable pins and favorites are their own arrays in navigation.json. All
// functions are pure (no store, no IPC) so they unit-test without a DOM.

import type { NavRef, SelectTarget } from '@shared/types'

/** Generous default history depth (deep history + a tunable cap, not a tight ~50). */
export const RECENTS_CAP = 100

/** Identity of a nav ref or live target — kind+id, or bare kind for the id-less homepage. Shared
 *  by the history dedupe, the recents stream, and favorites/pins membership so all collapse the
 *  same targets. */
export function navKey(t: NavRef | SelectTarget): string {
  return 'id' in t ? `${t.kind}:${t.id}` : t.kind
}

/** Identity only — the one strip between a live target and anything stored, so in-memory arrays,
 *  the persist payload, and the file are one shape. */
export function toNavRef(t: NavRef | SelectTarget): NavRef {
  return 'id' in t ? { kind: t.kind, id: t.id } : { kind: t.kind }
}

/** Record a visit: dedupe by key, move-to-front, then roll off the oldest beyond `cap`. */
export function recordRecent(recents: NavRef[], target: NavRef | SelectTarget, cap = RECENTS_CAP): NavRef[] {
  const ref = toNavRef(target)
  const key = navKey(ref)
  return capRecents([ref, ...recents.filter((r) => navKey(r) !== key)], cap)
}

/** Keep the newest `cap` entries (the list is newest-first, so the front — the just-recorded visit —
 *  always survives). */
function capRecents(recents: NavRef[], cap: number): NavRef[] {
  return recents.length <= cap ? recents : recents.slice(0, cap)
}

/** Drop the entry whose navKey matches `key` — the NavList row's Remove action. Returns the same list
 *  reference when nothing matched, so the caller can skip a needless persist. */
export function removeRecentByKey(recents: NavRef[], key: string): NavRef[] {
  const next = recents.filter((r) => navKey(r) !== key)
  return next.length === recents.length ? recents : next
}
