import type { GroupKind } from '@pommora/core/Views/viewRow'

/** Structural Set bands only — a property or ungrouped bucket has no inferable create location. */
export function bandShowsAdd(kind: GroupKind): boolean {
  return kind === 'structural-set'
}
