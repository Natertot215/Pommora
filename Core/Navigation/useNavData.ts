import { useCallback, useMemo } from 'react'
import type { NavRef } from './navRef'
import { useSession } from '../Session/store'
import { reconcileIndexOf, resolveIndexOf, searchEntriesOf } from '../Nexus/treeIndex'
import { liveTarget } from './tabsModel'
import { resolveAll, type ResolvedNav } from './navResolve'
import { filterNav, type SearchEntry } from './navSearch'

/** A stable empty index — a fresh literal per render would churn the search callback's deps. */
const NO_ENTRIES: SearchEntry[] = []

export function useNavData(): {
  resolvedRecents: ResolvedNav[]
  resolvedPins: ResolvedNav[]
  search: (query: string) => ResolvedNav[]
  go: (target: NavRef, onDone?: () => void, opts?: { newTab?: boolean }) => void
} {
  const tree = useSession((s) => s.tree)
  const recents = useSession((s) => s.recents)
  const pinned = useSession((s) => s.pinned)
  const select = useSession((s) => s.select)

  const resolveIndex = tree ? resolveIndexOf(tree) : null
  const searchIndex = tree ? searchEntriesOf(tree) : NO_ENTRIES
  const resolvedPins = useMemo(
    () => (resolveIndex ? resolveAll(resolveIndex, pinned) : []),
    [resolveIndex, pinned],
  )
  const pinnedKeys = useMemo(() => new Set(resolvedPins.map((p) => p.key)), [resolvedPins])
  // Recents dedupe against pins — a pinned entity shows once, in the pins section, not twice.
  const resolvedRecents = useMemo(
    () =>
      resolveIndex ? resolveAll(resolveIndex, recents).filter((r) => !pinnedKeys.has(r.key)) : [],
    [resolveIndex, recents, pinnedKeys],
  )

  const search = useCallback(
    (query: string): ResolvedNav[] => {
      if (!resolveIndex || !query.trim()) return []
      return resolveAll(
        resolveIndex,
        filterNav(searchIndex, query).map((entry) => entry.target),
      )
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

  return { resolvedRecents, resolvedPins, search, go }
}
