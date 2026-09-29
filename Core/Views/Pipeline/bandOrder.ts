// Listed sets lead in array order, unlisted sets trail in fs order; non-structural groups HOLD their slot, so the view-level ungrouped_placement survives a manual band order.

import type { ResolvedGroup } from '@pommora/core/Views/viewRow'
import { resolveRowOrder } from '@pommora/core/Properties/rowOrder'

export function orderGroups(
  groups: ResolvedGroup[],
  groupOrder: string[] | undefined,
): ResolvedGroup[] {
  if (!groupOrder || groupOrder.length === 0) return groups
  const walk = (level: ResolvedGroup[]): ResolvedGroup[] => {
    const recursed = level.map((g) => (g.children ? { ...g, children: walk(g.children) } : g))
    const sets = resolveRowOrder(
      recursed.filter((g) => g.kind === 'set'),
      (g) => g.key,
      groupOrder,
    )
    let i = 0
    return recursed.map((g) => (g.kind === 'set' ? sets[i++] : g))
  }
  return walk(groups)
}
