import type { NavRef } from './navRef'
import { type MatchKey, matchQuery, rankMatches } from '../Paths/caseFold'

export interface SearchEntry {
  key: string
  target: NavRef
  title: string
  /** Keyed once at build — filterNav scores EVERY entry on every keystroke. */
  match: MatchKey
}

export function filterNav(index: SearchEntry[], query: string): SearchEntry[] {
  const q = matchQuery(query)
  return q ? rankMatches(index, q, (e) => e.match, 50) : []
}
