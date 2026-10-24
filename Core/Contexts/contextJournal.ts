// A title rename writes this record first, commits the registry title, moves the folder, cascades, then clears it; a crash at any point leaves an exact old→new record that replays idempotently on the next open.

import { CONTEXT_JOURNAL_FILENAME } from '../Paths/nexusPaths'
import { holdsName } from '../Paths/names'
import { journalSlot } from '../Properties/journalSlot'

export interface RenameJournal {
  contextId: string
  spaceId?: string
  oldTitle: string
  newTitle: string
}

function decode(raw: Record<string, unknown>): RenameJournal | null {
  if (
    typeof raw.contextId !== 'string' ||
    typeof raw.oldTitle !== 'string' ||
    typeof raw.newTitle !== 'string' ||
    !holdsName(raw.oldTitle) ||
    !holdsName(raw.newTitle)
  )
    return null
  return {
    contextId: raw.contextId,
    ...(typeof raw.spaceId === 'string' ? { spaceId: raw.spaceId } : {}),
    oldTitle: raw.oldTitle,
    newTitle: raw.newTitle,
  }
}

const same = (a: RenameJournal, b: RenameJournal): boolean =>
  a.contextId === b.contextId &&
  a.spaceId === b.spaceId &&
  a.oldTitle === b.oldTitle &&
  a.newTitle === b.newTitle

const sameEntity = (a: RenameJournal, b: RenameJournal): boolean =>
  a.contextId === b.contextId && a.spaceId === b.spaceId

const slot = journalSlot<RenameJournal>(CONTEXT_JOURNAL_FILENAME, decode, same, sameEntity)

export const writeJournal = slot.write
export const readJournal = slot.read
export const clearJournal = slot.clear
