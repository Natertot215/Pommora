// The schema-cascade journal — `.nexus/property-cascade.json`, one record max, the property
// side's sibling of contextJournal. A cascade writes its intent FIRST, sweeps, then clears; a
// crash at any point leaves an id-keyed record the open-time replay either forward-completes or
// discards. Intent only, never a snapshot: the replay re-derives its targets from current disk.

import { rm } from 'node:fs/promises'
import { readJsonObject, writeJson } from '../io/atomicWrite'
import { recordWrite } from '../io/writeEcho'
import { nexusConfig } from '../paths'
import { sessionRoot } from '../session'

const JOURNAL_FILE = 'property-cascade.json'

export type SchemaJournal =
  | { op: 'rename'; id: string; from: string; to: string }
  | { op: 'delete'; id: string; name: string }
  | { op: 'option-rename'; id: string; from: string; to: string }
  | { op: 'option-strip'; id: string; value: string; drop: boolean }

const journalPath = (root: string): string => nexusConfig(root, JOURNAL_FILE)

export async function writeSchemaJournal(root: string, j: SchemaJournal): Promise<void> {
  await writeJson(journalPath(root), j)
}

export async function readSchemaJournal(root: string): Promise<SchemaJournal | null> {
  const raw = await readJsonObject(journalPath(root))
  if (!raw || typeof raw.id !== 'string') return null
  switch (raw.op) {
    case 'rename':
    case 'option-rename':
      if (typeof raw.from !== 'string' || typeof raw.to !== 'string') return null
      return { op: raw.op, id: raw.id, from: raw.from, to: raw.to }
    case 'delete':
      if (typeof raw.name !== 'string') return null
      return { op: 'delete', id: raw.id, name: raw.name }
    case 'option-strip':
      if (typeof raw.value !== 'string' || typeof raw.drop !== 'boolean') return null
      return { op: 'option-strip', id: raw.id, value: raw.value, drop: raw.drop }
    default:
      return null
  }
}

/** A clear only lands for the live session's root — a mid-op nexus switch leaves the record
 *  for that root's next open, where the replay disposes of it against real state. */
export async function clearSchemaJournal(root: string): Promise<void> {
  if (sessionRoot() !== root) return
  // The unlink is a `.nexus` event the watcher classifies full-refresh; echo it away.
  recordWrite(journalPath(root))
  await rm(journalPath(root), { force: true })
}
