import './drop-chrome.css'
import { moveItem } from '../Utilities/moveItem'

export { toBox, type Box, type Carried, type DragItem } from './shared'
export {
  DragGroup,
  DropSlot,
  SortableZone,
  useDragFamily,
  useDragItem,
  useEscort,
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
