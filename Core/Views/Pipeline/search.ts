import { type MatchKey, matches } from '../../Paths/caseFold'
import { isEmptyBand, type ResolvedGroup } from '../viewRow'

export function searchGroups(
  groups: ResolvedGroup[],
  needle: string,
  keys: Map<string, MatchKey>,
): ResolvedGroup[] {
  return groups.flatMap((group) => {
    const items = group.items.filter((row) => matches(keys.get(row.id)!, needle))
    const children = group.children && searchGroups(group.children, needle, keys)
    return isEmptyBand({ items, children }) ? [] : [{ ...group, items, children }]
  })
}
