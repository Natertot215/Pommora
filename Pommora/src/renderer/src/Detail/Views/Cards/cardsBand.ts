import type { GroupKind } from '@shared/types'

/** The band "+" (create a page in this band's Set) shows on structural Set bands only — a
 *  property or ungrouped bucket has no inferable create location. */
export function bandShowsAdd(kind: GroupKind): boolean {
  return kind === 'structural-set'
}
