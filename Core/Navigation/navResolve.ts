// An entry that no longer resolves is RENDER-pruned, never dropped from storage — a cross-nexus switch resolves everything to null, and auto-deleting would wipe durable favorites.

import type { NavRef } from '@pommora/core/Navigation/navRef'
import type { TrailSegment } from '@pommora/uix/Elements/NavTrail'
import { navKey } from './navRecents'

export interface ResolvedNav {
  key: string
  target: NavRef
  kind: NavRef['kind']
  title: string
  icon: string
  path: TrailSegment[]
  pinned?: boolean
}

export type NavCore = { icon: string; title: string; path: TrailSegment[] }
export type ResolveIndex = Map<string, NavCore>

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

export function resolveRecents(index: ResolveIndex, recents: NavRef[]): ResolvedNav[] {
  return recents.map((r) => resolveWith(index, r)).filter((r): r is ResolvedNav => r !== null)
}

export function resolveFavorites(index: ResolveIndex, favorites: NavRef[]): ResolvedNav[] {
  return favorites.map((f) => resolveWith(index, f)).filter((r): r is ResolvedNav => r !== null)
}

export function resolvePins(index: ResolveIndex, pins: NavRef[]): ResolvedNav[] {
  return pins
    .map((p) => resolveWith(index, p))
    .filter((r): r is ResolvedNav => r !== null)
    .map((r) => ({ ...r, pinned: true }))
}
