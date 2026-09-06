import type { NavRef } from '@pommora/core/Navigation/navRef'

export interface SearchEntry {
  key: string
  target: NavRef
  title: string
  /** Lowercased once at build — filterNav scores EVERY entry on every keystroke. */
  lower: string
}

/** Exported for surfaces outside navigation whose subjects carry no `NavRef` to put in a `SearchEntry` — one scorer, however the caller holds its rows. */
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
