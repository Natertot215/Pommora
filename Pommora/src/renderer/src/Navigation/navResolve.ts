// An entry that no longer resolves (deleted, or a cross-nexus target against the wrong tree) is
// RENDER-PRUNED — dropped from the returned list, NEVER from storage (a cross-nexus switch
// resolves everything to null; auto-deleting would wipe durable favorites). Resolution goes
// through a display index built in ONE tree walk — the gallery must never re-flatten the tree per row.

import { entityIcon, iconNameOr } from '@renderer/design-system/symbols'
import type { NavTarget, NexusTree, PinEntry, RecentEntry } from '@shared/types'
import { allCollections } from '../selection'
import { navKey } from './navRecents'

/** One container in an entry's path — its resolved icon glyph + title (chevron-joined at render). */
export interface PathCrumb {
  icon: string
  title: string
}

export interface ResolvedNav {
  key: string
  /** The clean nav target to select on click — exactly the entry's {kind,id,path}, no `pinned`. */
  target: NavTarget
  kind: NavTarget['kind']
  title: string
  icon: string
  /** The container chain the entry lives under (empty for a top-level Collection / Homepage). */
  path: PathCrumb[]
  /** Drives the pin button's active/toggle state at render (is-pinned style, aria-label). */
  pinned?: boolean
}

type NavCore = { icon: string; title: string; path: PathCrumb[] }
/** navKey → display core. Built once per tree; resolution is then an O(1) lookup per entry. */
export type ResolveIndex = Map<string, NavCore>

/** Flatten the tree into the display index in a single walk: homepage, every Space (its Context as
 *  the path), every Collection, every Set + Page (their resolved container chain). Icons resolve
 *  against the Nexus's default-icon overrides, matching the sidebar. */
export function buildResolveIndex(tree: NexusTree): ResolveIndex {
  const ix: ResolveIndex = new Map()
  const di = tree.personalization.defaultIcons
  const colIcon = (n: { icon?: string }): string => entityIcon('collection', n.icon, di)
  const setIcon = (n: { icon?: string }): string => entityIcon('set', n.icon, di)

  ix.set('homepage', {
    icon: iconNameOr(tree.nexus.profileIcon, 'house'),
    title: tree.nexus.name,
    path: [],
  })
  for (const g of tree.contexts ?? []) {
    const groupCrumb: PathCrumb = {
      icon: entityIcon('space', g.def.icon, di),
      title: g.def.title,
    }
    for (const s of g.spaces)
      ix.set(`space:${s.id}`, {
        icon: entityIcon('space', s.icon, di),
        title: s.title,
        path: [groupCrumb],
      })
  }
  const walkSets = (
    sets: NexusTree['collections'][number]['sets'] | undefined,
    parents: PathCrumb[],
  ): void => {
    for (const s of sets ?? []) {
      ix.set(`set:${s.id}`, { icon: setIcon(s), title: s.title, path: parents })
      const chain = [...parents, { icon: setIcon(s), title: s.title }]
      for (const p of s.pages)
        ix.set(`page:${p.id}`, { icon: entityIcon('page', p.icon, di), title: p.title, path: chain })
      walkSets(s.sets, chain)
    }
  }
  for (const col of allCollections(tree)) {
    ix.set(`collection:${col.id}`, { icon: colIcon(col), title: col.title, path: [] })
    const colCrumb: PathCrumb = { icon: colIcon(col), title: col.title }
    for (const p of col.pages)
      ix.set(`page:${p.id}`, {
        icon: entityIcon('page', p.icon, di),
        title: p.title,
        path: [colCrumb],
      })
    walkSets(col.sets, [colCrumb])
  }
  return ix
}

/** Strip a recents entry down to its clean nav target (no `pinned`), for select-on-click + storage. */
function cleanTarget(entry: RecentEntry): NavTarget {
  const { pinned: _pinned, ...target } = entry
  return target as NavTarget
}

/** Resolve one entry against a prebuilt index, or null when it no longer resolves (render-prune). */
export function resolveWith(index: ResolveIndex, entry: RecentEntry): ResolvedNav | null {
  const key = navKey(entry)
  const core = index.get(key)
  if (!core) return null
  return {
    key,
    target: cleanTarget(entry),
    kind: entry.kind,
    title: core.title,
    icon: core.icon,
    path: core.path,
    pinned: entry.pinned,
  }
}

/** Resolve the recents stream for render against a prebuilt index: prune gone entries, preserve MRU
 *  order. Pins are their own durable list (resolvePins) — recents no longer float. */
export function resolveRecents(index: ResolveIndex, recents: RecentEntry[]): ResolvedNav[] {
  return recents.map((r) => resolveWith(index, r)).filter((r): r is ResolvedNav => r !== null)
}

/** Resolve favorites against a prebuilt index: prune gone entries, preserve stored order. */
export function resolveFavorites(index: ResolveIndex, favorites: RecentEntry[]): ResolvedNav[] {
  return favorites.map((f) => resolveWith(index, f)).filter((r): r is ResolvedNav => r !== null)
}

/** Resolve durable pins against a prebuilt index: prune gone entries (render-prune, never storage —
 *  a moved/deleted pin's file stays), preserve the caller's order, mark each `pinned`. */
export function resolvePins(index: ResolveIndex, pins: PinEntry[]): ResolvedNav[] {
  return pins
    .map((p) => resolveWith(index, p))
    .filter((r): r is ResolvedNav => r !== null)
    .map((r) => ({ ...r, pinned: true }))
}
