// The trash row's right-click menu. A returning menu — main pops it and hands the action back, so
// the leaf performs the write and can then refresh the list it is looking at.

import type { MoveTarget } from './cardMenu'
import type { DateFormat } from './columnStyles'
import type { RestoreDestination } from './mutate'

export type TrashMenuAction =
  | { kind: 'restore' }
  | { kind: 'delete' }
  | { kind: 'restoreAll' }
  | { kind: 'deleteAll' }
  | { kind: 'restoreTo'; destination: RestoreDestination }

export interface TrashMenuContext {
  /** Act on the checked set rather than the row under the pointer. The renderer decides: a
   *  right-click on an unchecked row acts on that row alone, whatever else is checked. */
  batch: boolean
  /** The places this row may be sent, when its recorded home no longer resolves. Absent means the
   *  home is there and Restore acts without asking. A batch never carries one — checked rows can be
   *  different kinds from different homes, and one pick cannot answer for all of them. */
  destinations?: MoveTarget[]
  /** Which address a destination pick carries, decided by the row's kind. */
  destinationKind?: RestoreDestination['kind']
}

/** The two actions, in both of their voices. A count in the label would be the first anywhere in
 *  the app; the plural carries the same meaning without inventing one. */
export function trashMenuLabels(batch: boolean): { restore: string; delete: string } {
  return batch
    ? { restore: 'Restore All', delete: 'Delete All' }
    : { restore: 'Restore', delete: 'Delete' }
}

/** The two ways this column writes a date: short is the numeric one, full is the worded one. A
 *  hand-edited settings file may still name any other `DateFormat` and the column will honour it. */
export const TRASH_DATE_FORMATS: { value: DateFormat; label: string }[] = [
  { value: 'monthDayYear', label: 'Short Date' },
  { value: 'full', label: 'Full Date' },
]

export type TrashColumnAction =
  | { kind: 'format'; format: DateFormat }
  | { kind: 'toggleTime' }

export interface TrashColumnContext {
  /** The format in force, so its row can read as chosen. */
  format: DateFormat
  /** Whether the clock currently shows — the action names the state it moves to. */
  timeShown: boolean
}
