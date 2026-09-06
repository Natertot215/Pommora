// The action resolves back to the leaf, which performs the write and can then refresh the list it is looking at.

import type { ActionItem } from './menuModel'
import { destinationRows, type MoveTarget } from './pageMenu'
import type { DateFormat } from '../Properties/columnStyles'

export type TrashMenuAction =
  | 'restore'
  | 'delete'
  | 'restoreAll'
  | 'deleteAll'
  | `restoreTo:${string}`

export interface TrashMenuContext {
  /** The renderer decides: a right-click on an unchecked row acts on that row alone, whatever else is checked. */
  batch: boolean
  /** Absent means the recorded home resolves and Restore acts without asking. */
  destinations?: MoveTarget[]
}

/** A count in the label would be the first anywhere in the app; the plural says as much. */
export function trashMenuLabels(batch: boolean): { restore: string; delete: string } {
  return batch
    ? { restore: 'Restore All', delete: 'Delete All' }
    : { restore: 'Restore', delete: 'Delete' }
}

/** A row whose home is gone turns Restore into a question of where; nowhere to put it is not nothing to do, so the row stays and reads disabled. */
export function trashMenuItems(ctx: TrashMenuContext): ActionItem<TrashMenuAction>[] {
  const label = trashMenuLabels(ctx.batch)
  const restore: ActionItem<TrashMenuAction> = ctx.destinations
    ? {
        label: label.restore,
        action: 'restore',
        disabled: ctx.destinations.length === 0,
        submenu: destinationRows(ctx.destinations, (t) => `restoreTo:${t.id}` as const),
      }
    : { label: label.restore, action: ctx.batch ? 'restoreAll' : 'restore' }
  return [
    restore,
    { label: label.delete, action: ctx.batch ? 'deleteAll' : 'delete', separatorBefore: true },
  ]
}

/** A hand-edited settings file may still name any other `DateFormat`, and the column honors it. */
export const TRASH_DATE_FORMATS: { value: DateFormat; label: string }[] = [
  { value: 'monthDayYear', label: 'Short Date' },
  { value: 'full', label: 'Full Date' },
]

export type TrashColumnAction = `format:${DateFormat}` | 'toggleTime'

export interface TrashColumnContext {
  format: DateFormat
  /** Whether the clock currently shows — the action names the state it moves to. */
  timeShown: boolean
}

/** Picking the format in force is a no-op the menu shows rather than hides. */
export function trashColumnMenuItems(ctx: TrashColumnContext): ActionItem<TrashColumnAction>[] {
  return [
    {
      label: 'Format',
      action: `format:${TRASH_DATE_FORMATS[0].value}`,
      submenu: TRASH_DATE_FORMATS.map((f) => ({
        label: f.label,
        action: `format:${f.value}`,
        checked: f.value === ctx.format,
      })),
    },
    { label: ctx.timeShown ? 'Hide Time' : 'Show Time', action: 'toggleTime' },
  ]
}
