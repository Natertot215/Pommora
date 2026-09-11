import type { ReactNode } from 'react'
import { Zone, useDropSlot, useZoneItem } from './engine'
import './drop-chrome.css'
import { DragGroup, GroupZone, useGroupedDragItem } from './group'
import type { DragItem } from './shared'
import { moveItem } from '../Utilities/moveItem'

export type { DragItem }
export { DragGroup, useGroupedDragItem, useDropSlot }

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

type SortableZoneProps = {
  id?: string
  items: string[]
  onReorder?: (activeId: string, overId: string) => void
  disabled?: boolean
  axis?: 'x' | 'y'
  getItemLabel?: (id: string) => string
  group?: string
  className?: string
  children: ReactNode
}

export function SortableZone(props: SortableZoneProps): React.JSX.Element {
  if (props.group != null) {
    return (
      <GroupZone id={props.id ?? props.group} items={props.items} className={props.className}>
        {props.children}
      </GroupZone>
    )
  }
  const { id: _id, items, group: _group, className: _className, children, ...rest } = props
  return (
    <Zone ids={items} {...rest}>
      {children}
    </Zone>
  )
}

export function useDragItem(id: string): DragItem {
  return useZoneItem(id)
}
