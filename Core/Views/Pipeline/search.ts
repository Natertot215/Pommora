import { fuzzyScore } from '@pommora/core/Navigation/navSearch'
import { isEmptyBand, type ResolvedGroup } from '@pommora/core/Views/viewRow'

export function searchGroups(
  groups: ResolvedGroup[],
  needle: string,
  titles: Map<string, string>,
): ResolvedGroup[] {
  return groups.flatMap((group) => {
    const items = group.items.filter((row) => fuzzyScore(titles.get(row.id) ?? '', needle) !== null)
    const children = group.children && searchGroups(group.children, needle, titles)
    return isEmptyBand({ items, children }) ? [] : [{ ...group, items, children }]
  })
}
