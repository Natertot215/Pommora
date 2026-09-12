import './drop-chrome.css'
import type { DragItem } from './shared'
import { moveItem } from '../Utilities/moveItem'

export type { DragItem }
export { DragGroup, SortableZone, useDragItem, useDropSlot } from './engine'

export function reorder<T extends { id: string }>(
  items: T[],
  activeId: string,
  overId: string,
): T[] {
  const from = items.findIndex((i) => i.id === activeId)
  const to = items.findIndex((i) => i.id === overId)
  if (from === -1 || to === -1 || from === to) return items
  return moveItem(items, from, to)
}
