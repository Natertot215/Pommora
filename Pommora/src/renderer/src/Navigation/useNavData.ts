import { useCallback, useMemo } from 'react'
import type { NavRef } from '@shared/types'
import { useSession } from '../store'
import { reconcileIndexOf, resolveIndexOf, searchEntriesOf } from '../treeIndex'
import { liveTarget } from '../Tabs/tabsModel'
import {
  resolveFavorites,
  resolvePins,
  resolveRecents,
  resolveWith,
  type ResolvedNav,
} from './navResolve'
import { filterNav, type SearchEntry } from './navSearch'

/** A stable empty index — a fresh literal per render would churn the search callback's deps. */
const NO_ENTRIES: SearchEntry[] = []

export interface SearchResult {
  entry: SearchEntry
  /** Resolved display, or null for a hit whose kind has no click destination. */
  resolved: ResolvedNav | null
}

/** Split search results into the NavList shape both surfaces render: resolved hits become selectable
 *  `items`; unresolvable ones become inert `extras`. */
export function splitSearch(results: SearchResult[]): {
  items: ResolvedNav[]
  extras: { key: string; title: string; kind: string }[]
} {
  return {
    items: results.map((r) => r.resolved).filter((r): r is ResolvedNav => r !== null),
    extras: results
      .filter((r) => r.resolved === null)
      .map((r) => ({ key: r.entry.key, title: r.entry.title, kind: r.entry.target.kind })),
  }
}

/** The shared read side both NavWindow + NavMenu render from — one source, two presentations. The tree
 *  index is memoized per tree, so search filters per keystroke WITHOUT re-walking the tree. */
export function useNavData(): {
  resolvedRecents: ResolvedNav[]
  resolvedFavorites: ResolvedNav[]
  resolvedPins: ResolvedNav[]
  search: (query: string) => SearchResult[]
  go: (target: NavRef, onDone?: () => void, opts?: { newTab?: boolean }) => void
} {
  const tree = useSession((s) => s.tree)
  const recents = useSession((s) => s.recents)
  const favorites = useSession((s) => s.favorites)
  const pinned = useSession((s) => s.pinned)
  const select = useSession((s) => s.select)

  const resolveIndex = tree ? resolveIndexOf(tree) : null
  const searchIndex = tree ? searchEntriesOf(tree) : NO_ENTRIES
  const resolvedPins = useMemo(
    () => (resolveIndex ? resolvePins(resolveIndex, pinned) : []),
    [resolveIndex, pinned],
  )
  const pinnedKeys = useMemo(() => new Set(resolvedPins.map((p) => p.key)), [resolvedPins])
  // Recents dedupe against pins — a pinned entity shows once, in the pins section, not twice.
  const resolvedRecents = useMemo(
    () =>
      resolveIndex
        ? resolveRecents(resolveIndex, recents).filter((r) => !pinnedKeys.has(r.key))
        : [],
    [resolveIndex, recents, pinnedKeys],
  )
  const resolvedFavorites = useMemo(
    () => (resolveIndex ? resolveFavorites(resolveIndex, favorites) : []),
    [resolveIndex, favorites],
  )

  const search = useCallback(
    (query: string): SearchResult[] => {
      if (!resolveIndex || !query.trim()) return []
      return filterNav(searchIndex, query).map((entry) => ({
        entry,
        resolved: resolveWith(resolveIndex, entry.target),
      }))
    },
    [searchIndex, resolveIndex],
  )

  const go = useCallback(
    (target: NavRef, onDone?: () => void, opts?: { newTab?: boolean }): void => {
      // A stored ref carries no path — the click mints one against the live tree. A ref that
      // fails to resolve does not navigate: there is nothing to fall back to.
      if (!tree) return
      const live = liveTarget(reconcileIndexOf(tree), target)
      if (!live) return
      void select(live, opts?.newTab ? { newTab: true } : undefined)
      onDone?.()
    },
    [select, tree],
  )

  return { resolvedRecents, resolvedFavorites, resolvedPins, search, go }
}
