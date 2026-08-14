// Client-side title search over the live tree — title/kind only; full-text/body search is a
// deferred Prospect resting on a SQLite FTS layer. The index carries a ready-to-select NavRef per
// hit and is built by treeIndex's searchEntriesOf, memoized per tree; filterNav is pure and
// re-runs per keystroke.

import type { NavRef } from '@shared/types'

export interface SearchEntry {
  key: string
  target: NavRef
  title: string
  /** Lowercased once at build — filterNav scores EVERY entry on every keystroke. */
  lower: string
}

/** Fuzzy subsequence score of an already-lowercased `t` against an already-lowercased `q`, or null
 *  when `q` isn't a subsequence. Rewards contiguous runs + word-start hits so substring/prefix
 *  matches rank highest. Exported for surfaces outside navigation whose subjects carry no `NavRef`
 *  to put in a `SearchEntry` — one scorer, however the caller holds its rows. */
export function fuzzyScore(t: string, q: string): number | null {
  let ti = 0
  let score = 0
  let streak = 0
  for (const ch of q) {
    const idx = t.indexOf(ch, ti)
    if (idx === -1) return null
    if (idx === ti) {
      streak++
      score += 2 + streak
    } else {
      streak = 0
      score += 1
    }
    if (idx === 0 || t[idx - 1] === ' ') score += 3
    ti = idx + 1
  }
  return score - t.length * 0.01 // gentle tiebreak toward shorter titles
}

/** Empty query → no results (the surface shows recents/favorites instead). */
export function filterNav(index: SearchEntry[], query: string, limit = 50): SearchEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const scored: { e: SearchEntry; s: number }[] = []
  for (const e of index) {
    const s = fuzzyScore(e.lower, q)
    if (s !== null) scored.push({ e, s })
  }
  scored.sort((a, b) => b.s - a.s || a.e.title.localeCompare(b.e.title))
  return scored.slice(0, limit).map((x) => x.e)
}
