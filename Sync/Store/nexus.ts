import type { DatabaseSync } from 'node:sqlite'
import type * as Wire from '@pommora/core/Sync/Contract/wire'

type NexusRow = { version: number; protocol: number; kdf: string; historyDays: number }
type RingRow = { keyId: string; holder: string; wrapped: string; createdMs: number }

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
    `INSERT OR REPLACE INTO ring (nexus_id, key_id, holder, wrapped, created_ms)
     VALUES (?, ?, ?, ?, ?)`,
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
      ring: (ringStatement.all(nexusId) as RingRow[]).map((r) => ({
        keyId: r.keyId,
        holder: r.holder,
        wrapped: r.wrapped,
        createdMs: r.createdMs,
      })),
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

    appendRing: (
      nexusId: string,
      base: number,
      add: Wire.RingEntry[],
    ): { ok: boolean; info: Wire.InfoRecord | null } => {
      db.exec('BEGIN')
      try {
        const current = readInfo(nexusId)
        if (current === null || current.version !== base) {
          db.exec('ROLLBACK')
          return { ok: false, info: current }
        }
        addEntries(nexusId, add)
        bumpVersion.run(nexusId)
        const after = readInfo(nexusId)
        db.exec('COMMIT')
        return { ok: true, info: after }
      } catch (e) {
        db.exec('ROLLBACK')
        throw e
      }
    },

    retention: (): { id: string; days: number }[] =>
      retentionStatement.all() as unknown as { id: string; days: number }[],

    dropHolder: (nexusId: string, holder: string): void => {
      dropStatement.run(nexusId, holder)
    },
  }
}
