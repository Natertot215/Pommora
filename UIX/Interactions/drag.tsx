import './drop-chrome.css'
import { moveItem } from '../Utilities/moveItem'

export type { Carried, DragItem } from './shared'
export {
  DragGroup,
  DropSlot,
  SortableZone,
  useDragFamily,
  useDragItem,
  useDropSlot,
  useEscort,
  type Escort,
  type EscortSpec,
} from './engine'

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
