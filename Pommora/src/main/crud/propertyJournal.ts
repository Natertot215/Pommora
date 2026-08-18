// The schema-cascade journal — `.nexus/property-cascade.json`, one record max, the property
// side's sibling of contextJournal. A cascade writes its intent FIRST, sweeps, then clears; a
// crash at any point leaves an id-keyed record the open-time replay either forward-completes or
// discards. Intent only, never a snapshot: the replay re-derives its targets from current disk.
// The slot protects what it holds — a write never displaces a stranded record, and a clear only
// lands for the record its caller staged, so an owed heal survives every later op untouched.

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
  | { op: 'option-remove'; id: string; value: string }

const journalPath = (root: string): string => nexusConfig(root, JOURNAL_FILE)

function sameRecord(a: SchemaJournal, b: SchemaJournal): boolean {
  if (a.op !== b.op || a.id !== b.id) return false
  switch (a.op) {
    case 'rename':
    case 'option-rename':
      return b.op === a.op && a.from === b.from && a.to === b.to
    case 'delete':
      return b.op === 'delete' && a.name === b.name
    case 'option-remove':
      return b.op === 'option-remove' && a.value === b.value
  }
}

/** Stage `j` unless a different record already holds the slot — a stranded record's owed heal
 *  outranks protecting the op now starting, which runs unjournaled in that already-faulted
 *  state and leaves the record for the next open's replay. */
export async function writeSchemaJournal(root: string, j: SchemaJournal): Promise<void> {
  const held = await readSchemaJournal(root)
  if (held && !sameRecord(held, j)) return
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
    case 'option-remove':
      if (typeof raw.value !== 'string') return null
      return { op: 'option-remove', id: raw.id, value: raw.value }
    default:
      return null
  }
}

/** A clear lands only for the record its caller staged, and only for the live session's root —
 *  a mid-op nexus switch or a slot another record holds leaves the file for that record's own
 *  settle or the next open, where the replay disposes of it against real state. */
export async function clearSchemaJournal(root: string, own: SchemaJournal): Promise<void> {
  if (sessionRoot() !== root) return
  const held = await readSchemaJournal(root)
  if (!held || !sameRecord(held, own)) return
  // The unlink is a `.nexus` event the watcher classifies full-refresh; echo it away.
  recordWrite(journalPath(root))
  await rm(journalPath(root), { force: true })
}
