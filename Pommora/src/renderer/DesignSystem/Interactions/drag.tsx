import type { ReactNode } from 'react'
import { Zone, useZoneItem } from './engine'
import { DragGroup, GroupZone, useGroupedDragItem, type DragGroupProps } from './group'
import type { DragItem, DragNotify, Modifier } from './shared'
import { moveItem } from '../Util/moveItem'

// The drag seam. Surfaces import ONLY from here — the engine lives behind it.

export type Row = { id: string; label: string }
export type Layout = 'list' | 'grid' | 'table'
export type { DragItem, DragNotify, DragGroupProps, Modifier }
export { DragGroup, useGroupedDragItem }

/** Reorder a list from the (activeId, overId) a zone reports — for shift-mode zones. */
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

/** Exchange two items — for `swap`-mode zones. */
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
  /** Informational only — the engine is geometry-driven, so list/grid/table share the same shift. */
  layout?: Layout
  onReorder?: (activeId: string, overId: string) => void
  /** Return false (or a Promise<false>) to reject a drop; the item animates back to origin. */
  canReorder?: (activeId: string, overId: string) => boolean | Promise<boolean>
  disabled?: boolean
  axis?: 'x' | 'y'
  /** Clamp the lifted item to the viewport (`window`) or the list's extent (`parent`). */
  bounds?: 'parent' | 'window'
  modifiers?: Modifier[]
  /** Exchange the active + over items instead of shifting the gap. Commit with `arraySwap`. */
  swap?: boolean
  /** ARIA role for each item's handle; default 'button'. Pass null to omit it entirely. */
  itemRole?: string | null
  /** Human label for screen-reader announcements (defaults to the id). */
  getItemLabel?: (id: string) => string
  group?: string
  /** Only used for grouped zones — standalone zones render no wrapper of their own to apply it to. */
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
  // Standalone: id/layout/group/className don't apply (no wrapper is rendered) — everything else
  // forwards through.
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

/** Wire one standalone item. Spread `handle` on the drag surface. */
export function useDragItem(id: string): DragItem {
  return useZoneItem(id)
}
