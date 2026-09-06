// The action resolves back to the leaf, which performs the write and can then refresh the list it is looking at.

import type { ActionItem } from './menuModel'
import { destinationRows, type MoveTarget } from './pageMenu'
import { DATE_FORMAT_LABELS, type DateFormat } from '../Properties/columnStyles'

type TrashMenuAction = 'restore' | 'delete' | 'restoreAll' | 'deleteAll' | `restoreTo:${string}`

interface TrashMenuContext {
  /** The renderer decides: a right-click on an unchecked row acts on that row alone, whatever else is checked. */
  batch: boolean
  /** Absent means the recorded home resolves and Restore acts without asking. */
  destinations?: MoveTarget[]
}

function trashMenuLabels(batch: boolean): { restore: string; delete: string } {
  return batch
    ? { restore: 'Restore All', delete: 'Delete All' }
    : { restore: 'Restore', delete: 'Delete' }
}

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
const TRASH_DATE_FORMATS = ['monthDayYear', 'full'] as const satisfies readonly DateFormat[]

type TrashColumnAction = `format:${DateFormat}` | 'toggleTime'

interface TrashColumnContext {
  format: DateFormat
  timeShown: boolean
}

export function trashColumnMenuItems(ctx: TrashColumnContext): ActionItem<TrashColumnAction>[] {
  return [
    {
      label: 'Format',
      action: `format:${TRASH_DATE_FORMATS[0]}`,
      submenu: TRASH_DATE_FORMATS.map((f) => ({
        label: DATE_FORMAT_LABELS[f],
        action: `format:${f}`,
        checked: f === ctx.format,
      })),
    },
    { label: ctx.timeShown ? 'Hide Time' : 'Show Time', action: 'toggleTime' },
  ]
}
