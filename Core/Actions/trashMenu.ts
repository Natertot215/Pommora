// The action resolves back to the leaf, which performs the write and can then refresh the list it is looking at.

import type { ActionItem } from './menuModel'
import { destinationRows, type MoveTarget } from './pageMenu'

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
        submenu: destinationRows(ctx.destinations, (t) => `restoreTo:${t.id}` as const),
      }
    : { label: label.restore, action: ctx.batch ? 'restoreAll' : 'restore' }
  return [
    restore,
    { label: label.delete, action: ctx.batch ? 'deleteAll' : 'delete', separatorBefore: true },
  ]
}
