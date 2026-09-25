export function nextOrder(current: string[], draggedId: string, beforeId: string | null): string[] {
  const without = current.filter((id) => id !== draggedId)
  const found = beforeId ? without.indexOf(beforeId) : -1
  const at = beforeId ? (found === -1 ? without.length : found) : without.length
  return [...without.slice(0, at), draggedId, ...without.slice(at)]
}

export type MeasuredRow = { id: string; top: number; bottom: number; mid: number }

/** Top half drops before `over`, bottom half after, skipping the dragged id so "after" can't resolve to itself. */
export function slotInGroup(
  group: string[],
  over: MeasuredRow,
  clientY: number,
  draggedId: string,
): { beforeId: string | null; edge: number } {
  const before = clientY < over.mid
  const pos = group.indexOf(over.id)
  const beforeId = before ? over.id : (group.slice(pos + 1).find((id) => id !== draggedId) ?? null)
  return { beforeId, edge: before ? over.top : over.bottom }
}

/** The insertion index among `rows` with the dragged one removed, and the drop line: the gap's middle between two rows, else the last row's bottom, else `emptyTop`. */
export function scanSlot(
  rows: MeasuredRow[],
  draggedId: string,
  y: number,
  emptyTop: number,
): { i: number; lineY: number } {
  const others = rows.filter((r) => r.id !== draggedId)
  let i = 0
  while (i < others.length && y >= others[i].mid) i++
  const lineY =
    i === others.length
      ? (others[i - 1]?.bottom ?? emptyTop)
      : i === 0
        ? others[0].top
        : (others[i - 1].bottom + others[i].top) / 2
  return { i, lineY }
}

export type MeasuredGroup = { id: string; top: number; bottom: number; rows: MeasuredRow[] }
export type GroupedSlot = { groupId: string; top: number; to: number }

/** Groups split the pointer axis at the midpoints between them. `to` indexes the target group with the dragged row removed, `top` is the drop line's offset from that group's top, and a drop back into the row's own slot resolves to null. */
export function resolveGroupedSlot(
  draggedId: string,
  y: number,
  groups: MeasuredGroup[],
): GroupedSlot | null {
  const from = groups.find((g) => g.rows.some((r) => r.id === draggedId))
  if (!from) return null
  let grp = groups[groups.length - 1]
  for (let i = 0; i < groups.length - 1; i++) {
    if (y < (groups[i].bottom + groups[i + 1].top) / 2) {
      grp = groups[i]
      break
    }
  }
  const { i: to, lineY } = scanSlot(grp.rows, draggedId, y, grp.top)
  if (grp === from && to === from.rows.findIndex((r) => r.id === draggedId)) return null
  return { groupId: grp.id, top: lineY - grp.top, to }
}

export function walksTo(
  fromId: string,
  ancestorId: string,
  byId: Map<string, { parentId: string | null }>,
): boolean {
  let cur: string | null = fromId
  while (cur) {
    if (cur === ancestorId) return true
    cur = byId.get(cur)?.parentId ?? null
  }
  return false
}
