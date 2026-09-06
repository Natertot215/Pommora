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
