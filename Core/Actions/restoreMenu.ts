import { type ActionItem, joinGroups } from './menuModel'
import { destinationRows, type MoveTarget } from './pageMenu'

type RestoreMenuAction = 'restore' | 'delete' | `restoreTo:${string}`

/** Restore and Delete over what a right-click acts on (`actedOn`), named for a batch; the leaf performs the write and refreshes the list it shows. */
export function restoreMenuItems({
  batch,
  destinations,
  restoresBatch = true,
}: {
  batch: boolean
  /** Absent means the recorded home resolves and Restore acts without asking. */
  destinations?: MoveTarget[]
  /** False where one item restores at a time (File History), so a batch offers Delete All alone. */
  restoresBatch?: boolean
}): ActionItem<RestoreMenuAction>[] {
  const label = batch ? 'Restore All' : 'Restore'
  const restore: ActionItem<RestoreMenuAction> = destinations
    ? { label, submenu: destinationRows(destinations, (t) => `restoreTo:${t.id}` as const) }
    : { label, action: 'restore' }
  return joinGroups<RestoreMenuAction>([
    batch && !restoresBatch ? [] : [restore],
    [{ label: batch ? 'Delete All' : 'Delete', action: 'delete' }],
  ])
}
