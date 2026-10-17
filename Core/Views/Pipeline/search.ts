import { type MatchKey, matchScore } from '../../Paths/caseFold'
import { isEmptyBand, type ResolvedGroup } from '../viewRow'

export function searchGroups(
  groups: ResolvedGroup[],
  needle: string,
  keys: Map<string, MatchKey>,
): ResolvedGroup[] {
  return groups.flatMap((group) => {
    const items = group.items.filter((row) => matchScore(keys.get(row.id)!, needle) !== null)
    const children = group.children && searchGroups(group.children, needle, keys)
    return isEmptyBand({ items, children }) ? [] : [{ ...group, items, children }]
  })
}
