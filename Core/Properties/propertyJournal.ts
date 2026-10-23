// A cascade writes its intent FIRST, sweeps, then clears. Intent only, never a snapshot — the open-time replay re-derives its targets from current disk.

import { PROPERTY_JOURNAL_FILENAME } from '../Paths/nexusPaths'
import { same } from '../Files/stableJson'
import { journalSlot } from './journalSlot'
import { type ConfigReach, reachReport } from '../Nexus/configReach'
import type { MutateOutcome } from '../Nexus/mutateRequest'
import { fail } from '../Contract/result'

export type SchemaJournal =
  | { op: 'rename'; id: string; from: string; to: string }
  | { op: 'delete'; id: string; key: string }
  | { op: 'option-rename'; id: string; keys: [string, string][] }
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
      return { op: raw.op, id: raw.id, keys: raw.keys }
    default:
      return null
  }
}

const slot = journalSlot<SchemaJournal>(PROPERTY_JOURNAL_FILENAME, decodeSchemaJournal, same)

export const writeSchemaJournal = slot.write
export const readSchemaJournal = slot.read
export const clearSchemaJournal = slot.clear

export const OWED = fail('owed', 'An earlier change hasn’t reached every file yet.')

/** A schema op's answer: its cascade, and while it skipped a file, its record's replay as the Try Again. */
export const schemaCascade = (reach: ConfigReach, _record: SchemaJournal): MutateOutcome => ({
  cascade: reachReport(reach),
  ...(reach.skipped ? { retry: { op: 'finishOwed' as const } } : {}),
})
