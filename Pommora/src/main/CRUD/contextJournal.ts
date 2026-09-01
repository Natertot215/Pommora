// A title rename commits this record FIRST, cascades, commits the registry, then clears it; a
// crash at any point leaves an exact old→new record that replays idempotently on the next open.
// A record's identity is its rename — the skip list is settle state, so persisting it updates
// the held record rather than displacing it.

import { journalSlot } from './journalSlot'

export interface RenameJournal {
  contextId: string
  /** Present for a Space rename; absent for a Context rename. */
  spaceId?: string
  oldTitle: string
  newTitle: string
  /** Files the cascade could not read — the journal survives while any remain. */
  skipped: string[]
}

function decode(raw: Record<string, unknown>): RenameJournal | null {
  if (
    typeof raw.contextId !== 'string' ||
    typeof raw.oldTitle !== 'string' ||
    typeof raw.newTitle !== 'string'
  )
    return null
  return {
    contextId: raw.contextId,
    ...(typeof raw.spaceId === 'string' ? { spaceId: raw.spaceId } : {}),
    oldTitle: raw.oldTitle,
    newTitle: raw.newTitle,
    skipped: Array.isArray(raw.skipped)
      ? raw.skipped.filter((s): s is string => typeof s === 'string')
      : [],
  }
}

const same = (a: RenameJournal, b: RenameJournal): boolean =>
  a.contextId === b.contextId &&
  a.spaceId === b.spaceId &&
  a.oldTitle === b.oldTitle &&
  a.newTitle === b.newTitle

const sameEntity = (a: RenameJournal, b: RenameJournal): boolean =>
  a.contextId === b.contextId && a.spaceId === b.spaceId

const slot = journalSlot<RenameJournal>('context-rename.json', decode, same, sameEntity)

export const writeJournal = slot.write
export const readJournal = slot.read
export const clearJournal = slot.clear
