import type { NavRef } from './navRef'
import { foldKey, matchScore, rankMatches } from '../Paths/caseFold'

export interface SearchEntry {
  key: string
  target: NavRef
  title: string
  /** Folded once at build — filterNav scores EVERY entry on every keystroke. */
  folded: string
}

export function filterNav(index: SearchEntry[], query: string): SearchEntry[] {
  const q = foldKey(query.trim())
  return q ? rankMatches(index, (e) => matchScore(e.folded, q), 50) : []
}
