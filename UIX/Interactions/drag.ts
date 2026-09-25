import './drop-chrome.css'
import { moveByKey } from '../Utilities/moveItem'

export { toBox, type Box, type Carried, type DragItem } from './shared'
export {
  DragGroup,
  DropSlot,
  SortableZone,
  useDragFamily,
  useDragItem,
  useEscort,
} from './engine'

export const reorder = <T extends { id: string }>(
  items: T[],
  activeId: string,
  overId: string,
): T[] => moveByKey(items, (i) => i.id, activeId, overId) ?? items
