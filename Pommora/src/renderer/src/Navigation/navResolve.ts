// An entry that no longer resolves (deleted, or a cross-nexus target against the wrong tree) is
// RENDER-PRUNED — dropped from the returned list, NEVER from storage (a cross-nexus switch
// resolves everything to null; auto-deleting would wipe durable favorites). Resolution goes
// through the display index projected from the tree's records — the gallery must never
// re-flatten the tree per row.

import type { NavRef } from '@shared/types'
import { navKey } from './navRecents'

/** One container in an entry's path — its resolved icon glyph + title (chevron-joined at render). */
export interface PathCrumb {
  icon: string
  title: string
}

export interface ResolvedNav {
  key: string
  /** The bare ref to select on click — `go()` mints its path against the live tree. */
  target: NavRef
  kind: NavRef['kind']
  title: string
  icon: string
  /** The container chain the entry lives under (empty for a top-level Collection / Homepage). */
  path: PathCrumb[]
  /** Drives the pin button's active/toggle state at render (is-pinned style, aria-label). */
  pinned?: boolean
}

export type NavCore = { icon: string; title: string; path: PathCrumb[] }
/** navKey → display core. Projected once per tree; resolution is then an O(1) lookup per entry. */
export type ResolveIndex = Map<string, NavCore>

/** Resolve one entry against a prebuilt index, or null when it no longer resolves (render-prune). */
export function resolveWith(index: ResolveIndex, entry: NavRef): ResolvedNav | null {
  const key = navKey(entry)
  const core = index.get(key)
  if (!core) return null
  return {
    key,
    target: entry,
    kind: entry.kind,
    title: core.title,
    icon: core.icon,
    path: core.path,
  }
}

/** Resolve the recents stream for render against a prebuilt index: prune gone entries, preserve MRU
 *  order. Pins are their own durable list (resolvePins) — recents no longer float. */
export function resolveRecents(index: ResolveIndex, recents: NavRef[]): ResolvedNav[] {
  return recents.map((r) => resolveWith(index, r)).filter((r): r is ResolvedNav => r !== null)
}

/** Resolve favorites against a prebuilt index: prune gone entries, preserve stored order. */
export function resolveFavorites(index: ResolveIndex, favorites: NavRef[]): ResolvedNav[] {
  return favorites.map((f) => resolveWith(index, f)).filter((r): r is ResolvedNav => r !== null)
}

/** Resolve durable pins against a prebuilt index: prune gone entries (render-prune, never
 *  storage), preserve the caller's order, mark each `pinned`. */
export function resolvePins(index: ResolveIndex, pins: NavRef[]): ResolvedNav[] {
  return pins
    .map((p) => resolveWith(index, p))
    .filter((r): r is ResolvedNav => r !== null)
    .map((r) => ({ ...r, pinned: true }))
}
