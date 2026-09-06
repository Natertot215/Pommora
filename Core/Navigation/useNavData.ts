import { useCallback, useMemo } from 'react'
import type { NavRef } from '@pommora/core/Navigation/navRef'
import { useSession } from '../Session/store'
import { reconcileIndexOf, resolveIndexOf, searchEntriesOf } from '../Session/treeIndex'
import { liveTarget } from './tabsModel'
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

/** The tree index is memoized per tree, so search filters per keystroke WITHOUT re-walking the tree. */
export function useNavData(): {
  resolvedRecents: ResolvedNav[]
  resolvedFavorites: ResolvedNav[]
  resolvedPins: ResolvedNav[]
  search: (query: string) => ResolvedNav[]
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
    (query: string): ResolvedNav[] => {
      if (!resolveIndex || !query.trim()) return []
      return filterNav(searchIndex, query)
        .map((entry) => resolveWith(resolveIndex, entry.target))
        .filter((r): r is ResolvedNav => r !== null)
    },
    [searchIndex, resolveIndex],
  )

  const go = useCallback(
    (target: NavRef, onDone?: () => void, opts?: { newTab?: boolean }): void => {
      // A stored ref carries no path — the click mints one against the live tree, and a ref that fails to resolve does not navigate.
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
