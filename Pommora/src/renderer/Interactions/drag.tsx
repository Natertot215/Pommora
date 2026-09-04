import type { ReactNode } from 'react'
import { Zone, useDropSlot, useZoneItem } from './engine'
import './drop-chrome.css'
import { DragGroup, GroupZone, useGroupedDragItem, type DragGroupProps } from './group'
import type { DragItem, DragNotify, Modifier } from './shared'
import { moveItem } from '@renderer/DesignSystem/Util/moveItem'

export type Row = { id: string; label: string }
export type Layout = 'list' | 'grid' | 'table'
export type { DragItem, DragNotify, DragGroupProps, Modifier }
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

export function arraySwap<T extends { id: string }>(items: T[], aId: string, bId: string): T[] {
  const a = items.findIndex((i) => i.id === aId)
  const b = items.findIndex((i) => i.id === bId)
  if (a === -1 || b === -1 || a === b) return items
  const next = items.slice()
  ;[next[a], next[b]] = [next[b], next[a]]
  return next
}

export type SortableZoneProps = DragNotify & {
  id?: string
  items: string[]
  layout?: Layout
  onReorder?: (activeId: string, overId: string) => void
  canReorder?: (activeId: string, overId: string) => boolean | Promise<boolean>
  disabled?: boolean
  axis?: 'x' | 'y'
  bounds?: 'parent' | 'window'
  modifiers?: Modifier[]
  swap?: boolean
  itemRole?: string | null
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
  const {
    id: _id,
    items,
    layout: _layout,
    group: _group,
    className: _className,
    children,
    ...rest
  } = props
  return (
    <Zone ids={items} {...rest}>
      {children}
    </Zone>
  )
}

export function useDragItem(id: string): DragItem {
  return useZoneItem(id)
}
