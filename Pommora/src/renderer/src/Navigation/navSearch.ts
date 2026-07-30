// Client-side title search over the live tree (+ a cached agenda snapshot). v1 is title/kind only —
// full-text/body search is a deferred Prospect (needs a SQLite FTS layer that doesn't exist yet). The
// index carries a ready-to-select NavRef per hit; agenda hits (task/event) are find-only in v1 (no
// click destination yet), but ride the same index so search can already surface them. Pure — the UI
// memoizes buildNavIndex over (tree, agenda) and re-runs filterNav per keystroke.

import type { AgendaEntry, NavRef, NexusTree } from '@shared/types'
import { searchEntriesOf } from '../treeIndex'
import { navKey } from './navRecents'

export interface SearchEntry {
  key: string
  target: NavRef
  title: string
  /** Lowercased once at build — filterNav scores EVERY entry on every keystroke. */
  lower: string
}

const entry = (target: NavRef, title: string): SearchEntry => ({
  key: navKey(target),
  target,
  title,
  lower: title.toLowerCase(),
})

export function buildNavIndex(
  tree: NexusTree,
  agenda?: { tasks: AgendaEntry[]; events: AgendaEntry[] },
): SearchEntry[] {
  const treeEntries = searchEntriesOf(tree)
  if (!agenda) return treeEntries
  const out = [...treeEntries]
  for (const t of agenda.tasks) out.push(entry({ kind: 'task', id: t.id }, t.title))
  for (const e of agenda.events) out.push(entry({ kind: 'event', id: e.id }, e.title))
  return out
}

/** Fuzzy subsequence score of an already-lowercased `t` against an already-lowercased `q`, or null
 *  when `q` isn't a subsequence. Rewards contiguous runs + word-start hits so substring/prefix
 *  matches rank highest. */
function fuzzyScore(t: string, q: string): number | null {
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
