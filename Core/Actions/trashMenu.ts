// Main hands the action back so the leaf performs the write and can then refresh the list it is looking at.

import type { MoveTarget } from './pageMenu'
import type { DateFormat } from '../Properties/columnStyles'
import type { RestoreDestination } from '../Pages/mutateRequest'

export type TrashMenuAction =
  | { kind: 'restore' }
  | { kind: 'delete' }
  | { kind: 'restoreAll' }
  | { kind: 'deleteAll' }
  | { kind: 'restoreTo'; destination: RestoreDestination }

export interface TrashMenuContext {
  /** The renderer decides: a right-click on an unchecked row acts on that row alone, whatever else is checked. */
  batch: boolean
  /** Absent means the recorded home resolves and Restore acts without asking. */
  destinations?: MoveTarget[]
  destinationKind?: RestoreDestination['kind']
}

/** A count in the label would be the first anywhere in the app; the plural says as much. */
export function trashMenuLabels(batch: boolean): { restore: string; delete: string } {
  return batch
    ? { restore: 'Restore All', delete: 'Delete All' }
    : { restore: 'Restore', delete: 'Delete' }
}

/** A hand-edited settings file may still name any other `DateFormat`, and the column honors it. */
export const TRASH_DATE_FORMATS: { value: DateFormat; label: string }[] = [
  { value: 'monthDayYear', label: 'Short Date' },
  { value: 'full', label: 'Full Date' },
]

export type TrashColumnAction = { kind: 'format'; format: DateFormat } | { kind: 'toggleTime' }

export interface TrashColumnContext {
  format: DateFormat
  /** Whether the clock currently shows — the action names the state it moves to. */
  timeShown: boolean
}
