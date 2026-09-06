import { moveItem } from '@pommora/uix/Utilities/moveItem'

export function reorderIds(ids: string[], activeId: string, overId: string): string[] {
  const from = ids.indexOf(activeId)
  const to = ids.indexOf(overId)
  if (from === -1 || to === -1 || from === to) return [...ids]
  return moveItem(ids, from, to)
}
