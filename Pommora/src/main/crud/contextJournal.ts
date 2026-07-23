// The pending-rename journal — `.nexus/context-rename.json`, one record max. A title
// rename commits this record FIRST, cascades, commits the registry, then clears it; a
// crash at any point leaves an exact old→new record that replays idempotently on the
// next open (the one heal the no-fuzzy-match rule permits: it's a record, not a guess).
// Composes existing primitives only: the atomic write (whole-or-absent across any
// crash) and the .nexus-resident JSON snapshot idiom.

import { rm } from 'node:fs/promises'
import { ok, type Result } from '@shared/result'
import { readJsonObject, writeJson } from '../io/atomicWrite'
import { nexusConfig } from '../paths'

const JOURNAL_FILE = 'context-rename.json'

export interface RenameJournal {
  contextId: string
  /** Present for a Space rename; absent for a Context rename. */
  spaceId?: string
  oldTitle: string
  newTitle: string
  /** Files the cascade could not read — the journal survives while any remain. */
  skipped: string[]
}

const journalPath = (root: string): string => nexusConfig(root, JOURNAL_FILE)

export async function writeJournal(root: string, j: RenameJournal): Promise<Result<null>> {
  await writeJson(journalPath(root), j)
  return ok(null)
}

export async function readJournal(root: string): Promise<RenameJournal | null> {
  const raw = await readJsonObject(journalPath(root))
  if (!raw) return null
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

export async function clearJournal(root: string): Promise<void> {
  await rm(journalPath(root), { force: true })
}
