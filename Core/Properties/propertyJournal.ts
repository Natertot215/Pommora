// A cascade writes its intent FIRST, sweeps, then clears. Intent only, never a snapshot — the open-time replay re-derives its targets from current disk.

import { PROPERTY_JOURNAL_FILENAME } from '../Paths/nexusPaths'
import { same } from '../Files/stableJson'
import { journalSlot } from './journalSlot'
import { type ConfigReach, reachReport } from '../Nexus/configReach'
import type { CascadeReport } from '../Nexus/cascade'

export type SchemaJournal =
  | { op: 'rename'; id: string; from: string; to: string }
  | { op: 'delete'; id: string; key: string }
  | { op: 'option-rename'; id: string; keys: [string, string][]; labels?: [string, string] }
  | { op: 'option-remove'; id: string; key: string }

const isPair = (v: unknown): v is [string, string] =>
  Array.isArray(v) && v.length === 2 && v.every((w) => typeof w === 'string')

export function decodeSchemaJournal(raw: Record<string, unknown>): SchemaJournal | null {
  if (typeof raw.id !== 'string') return null
  switch (raw.op) {
    case 'rename':
      if (typeof raw.from !== 'string' || typeof raw.to !== 'string') return null
      return { op: raw.op, id: raw.id, from: raw.from, to: raw.to }
    case 'delete':
    case 'option-remove':
      if (typeof raw.key !== 'string') return null
      return { op: raw.op, id: raw.id, key: raw.key }
    case 'option-rename':
      if (!Array.isArray(raw.keys) || !raw.keys.every(isPair)) return null
      if (raw.labels !== undefined && !isPair(raw.labels)) return null
      return {
        op: raw.op,
        id: raw.id,
        keys: raw.keys,
        ...(raw.labels ? { labels: raw.labels } : {}),
      }
    default:
      return null
  }
}

const slot = journalSlot<SchemaJournal>(PROPERTY_JOURNAL_FILENAME, decodeSchemaJournal, same)

export const writeSchemaJournal = slot.write
export const readSchemaJournal = slot.read
export const clearSchemaJournal = slot.clear

/** A schema op's answer: its cascade, and the record whose replay reaches the files it skipped. */
export type SchemaCascade = { cascade: CascadeReport; owed?: SchemaJournal }

export const schemaCascade = (reach: ConfigReach, record?: SchemaJournal): SchemaCascade => ({
  cascade: reachReport(reach),
  ...(reach.skipped && record ? { owed: record } : {}),
})
