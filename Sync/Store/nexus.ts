import type { DatabaseSync } from 'node:sqlite'
import type * as Wire from '@pommora/core/Sync/Contract/wire'

type NexusRow = { version: number; protocol: number; kdf: string; historyDays: number }

export type RingOutcome =
  | { kind: 'absent' }
  | { kind: 'stale' | 'exists'; info: Wire.InfoRecord }
  | { kind: 'ok'; info: Wire.InfoRecord }

export function nexusStore(db: DatabaseSync) {
  const rowStatement = db.prepare(
    'SELECT version, protocol, kdf, history_days AS historyDays FROM nexus WHERE nexus_id = ?',
  )
  const ringStatement = db.prepare(
    `SELECT key_id AS keyId, holder, wrapped, created_ms AS createdMs FROM ring
     WHERE nexus_id = ? ORDER BY created_ms, key_id, holder`,
  )
  const insertNexus = db.prepare(
    'INSERT INTO nexus (nexus_id, version, protocol, kdf, history_days, seq) VALUES (?, 1, ?, ?, ?, 0)',
  )
  const insertRing = db.prepare(
    'INSERT INTO ring (nexus_id, key_id, holder, wrapped, created_ms) VALUES (?, ?, ?, ?, ?)',
  )
  const entryStatement = db.prepare(
    'SELECT 1 FROM ring WHERE nexus_id = ? AND key_id = ? AND holder = ?',
  )
  const bumpVersion = db.prepare('UPDATE nexus SET version = version + 1 WHERE nexus_id = ?')
  const dropStatement = db.prepare('DELETE FROM ring WHERE nexus_id = ? AND holder = ?')
  const retentionStatement = db.prepare('SELECT nexus_id AS id, history_days AS days FROM nexus')

  const readInfo = (nexusId: string): Wire.InfoRecord | null => {
    const row = rowStatement.get(nexusId) as NexusRow | undefined
    if (!row) return null
    return {
      version: row.version,
      protocol: 1,
      kdf: JSON.parse(row.kdf) as Wire.KdfParams,
      historyDays: row.historyDays,
      ring: ringStatement.all(nexusId) as unknown as Wire.RingEntry[],
    }
  }

  const addEntries = (nexusId: string, add: Wire.RingEntry[]): void => {
    for (const entry of add) {
      insertRing.run(nexusId, entry.keyId, entry.holder, entry.wrapped, entry.createdMs)
    }
  }

  return {
    readInfo,

    createInfo: (
      nexusId: string,
      record: Omit<Wire.InfoRecord, 'version'>,
    ): Wire.InfoRecord | null => {
      if (rowStatement.get(nexusId) !== undefined) return null
      db.exec('BEGIN')
      try {
        insertNexus.run(nexusId, record.protocol, JSON.stringify(record.kdf), record.historyDays)
        addEntries(nexusId, record.ring)
        db.exec('COMMIT')
      } catch (e) {
        db.exec('ROLLBACK')
        throw e
      }
      return readInfo(nexusId)
    },

    appendRing: (nexusId: string, base: number, add: Wire.RingEntry[]): RingOutcome => {
      db.exec('BEGIN')
      try {
        const outcome = ((): RingOutcome => {
          const current = readInfo(nexusId)
          if (current === null) return { kind: 'absent' }
          if (current.version !== base) return { kind: 'stale', info: current }
          const taken = add.some(
            (entry) => entryStatement.get(nexusId, entry.keyId, entry.holder) !== undefined,
          )
          if (taken) return { kind: 'exists', info: current }
          addEntries(nexusId, add)
          bumpVersion.run(nexusId)
          return { kind: 'ok', info: readInfo(nexusId) ?? current }
        })()
        db.exec(outcome.kind === 'ok' ? 'COMMIT' : 'ROLLBACK')
        return outcome
      } catch (e) {
        db.exec('ROLLBACK')
        throw e
      }
    },

    retention: (): { id: string; days: number }[] =>
      retentionStatement.all() as unknown as { id: string; days: number }[],

    dropHolder: (nexusId: string, holder: string): void => {
      if (Number(dropStatement.run(nexusId, holder).changes) > 0) bumpVersion.run(nexusId)
    },
  }
}
