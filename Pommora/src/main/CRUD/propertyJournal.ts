// The schema-cascade journal — `.nexus/property-cascade.json`, one record max on the shared
// journal slot, the property side's sibling of contextJournal. A cascade writes its intent
// FIRST, sweeps, then clears; a crash at any point leaves an id-keyed record the open-time
// replay either forward-completes or discards. Intent only, never a snapshot: the replay
// re-derives its targets from current disk.

import { journalSlot } from './journalSlot'

export type SchemaJournal =
  | { op: 'rename'; id: string; from: string; to: string }
  | { op: 'delete'; id: string; name: string }
  | { op: 'option-rename'; id: string; from: string; to: string }
  | { op: 'option-remove'; id: string; value: string }

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

function decode(raw: Record<string, unknown>): SchemaJournal | null {
  if (typeof raw.id !== 'string') return null
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

const slot = journalSlot<SchemaJournal>('property-cascade.json', decode, sameRecord)

export const writeSchemaJournal = slot.write
export const readSchemaJournal = slot.read
export const clearSchemaJournal = slot.clear
