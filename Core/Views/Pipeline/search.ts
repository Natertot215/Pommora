import { type MatchKey, matches, matchKey } from '../../Paths/caseFold'
import { relDirname } from '../../Paths/posix'
import { isEmptyBand, type ResolvedGroup, type ViewRow } from '../viewRow'

// A row's place is the Set chain below the source: every row shares the source's own name, which would otherwise keep them all.
export const searchKeysOf = (rows: ViewRow[], sourcePath: string): Map<string, MatchKey> =>
  new Map(
    rows.map((r) => [r.id, matchKey(r.title, relDirname(r.path).slice(sourcePath.length + 1))]),
  )

export function searchGroups(
  groups: ResolvedGroup[],
  needle: string,
  keys: Map<string, MatchKey>,
  created: ReadonlySet<string>,
): ResolvedGroup[] {
  return groups.flatMap((group) => {
    const items = group.items.filter(
      (row) => created.has(row.id) || matches(keys.get(row.id)!, needle),
    )
    const children = group.children && searchGroups(group.children, needle, keys, created)
    return isEmptyBand({ items, children }) ? [] : [{ ...group, items, children }]
  })
}
