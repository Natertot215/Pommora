import type { DatabaseSync } from 'node:sqlite'
import type * as Wire from '@pommora/core/Sync/Contract/wire'

interface ChangeRow {
  seq: number
  kind: Wire.Change['kind']
  path: string
  from_path: string | null
  record: string | null
  device: string
  at_ms: number
}

interface ItemRow {
  version: number
  deleted: number
}

const decode = (row: ChangeRow): Wire.Change => ({
  seq: row.seq,
  kind: row.kind,
  path: row.path,
  ...(row.from_path !== null && { from: row.from_path }),
  ...(row.record !== null && { record: JSON.parse(row.record) as Wire.ItemRecord }),
  device: row.device,
  atMs: row.at_ms,
})

export function logStore(db: DatabaseSync) {
  const putStatement = db.prepare(
    'INSERT OR IGNORE INTO blob (nexus_id, sha256, bytes, at_ms) VALUES (?, ?, ?, ?)',
  )
  const readStatement = db.prepare('SELECT bytes FROM blob WHERE nexus_id = ? AND sha256 = ?')
  const hasStatement = db.prepare('SELECT 1 FROM blob WHERE nexus_id = ? AND sha256 = ?')
  const seqStatement = db.prepare('SELECT seq FROM nexus WHERE nexus_id = ?')
  const bumpStatement = db.prepare('UPDATE nexus SET seq = seq + 1 WHERE nexus_id = ?')
  const itemStatement = db.prepare(
    'SELECT version, deleted FROM item WHERE nexus_id = ? AND path = ?',
  )
  const upsertItem = db.prepare(
    `INSERT INTO item (nexus_id, path, version, deleted) VALUES (?, ?, ?, ?)
     ON CONFLICT(nexus_id, path) DO UPDATE SET version = excluded.version, deleted = excluded.deleted`,
  )
  const insertChange = db.prepare(
    `INSERT INTO change (nexus_id, seq, kind, path, from_path, record, device, at_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const headStatement = db.prepare(
    `SELECT c.seq, c.kind, c.path, c.from_path, c.record, c.device, c.at_ms FROM item i
     JOIN change c ON c.nexus_id = i.nexus_id AND c.seq = i.version
     WHERE i.nexus_id = ? AND i.path = ?`,
  )
  const recordStatement = db.prepare('SELECT record FROM change WHERE nexus_id = ? AND seq = ?')
  const insertCapture = db.prepare(
    `INSERT INTO capture (nexus_id, path, sha256, at_ms, record) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT DO NOTHING`,
  )
  const requestStatement = db.prepare(
    'SELECT reply FROM request WHERE nexus_id = ? AND request_id = ?',
  )
  const changesStatement = db.prepare(
    `SELECT seq, kind, path, from_path, record, device, at_ms FROM change
     WHERE nexus_id = ? AND seq > ? ORDER BY seq LIMIT ?`,
  )
  const headsStatement = db.prepare(
    `SELECT DISTINCT c.seq, c.kind, c.path, c.from_path, c.record, c.device, c.at_ms FROM item i
     JOIN change c ON c.nexus_id = i.nexus_id AND c.seq = i.version
     WHERE i.nexus_id = ? AND i.version > ? ORDER BY i.version LIMIT ?`,
  )
  const sweepBlobs = db.prepare(
    `DELETE FROM blob WHERE nexus_id = ? AND at_ms < ?
       AND sha256 NOT IN (
         SELECT json_extract(c.record, '$.sha256') FROM item i
         JOIN change c ON c.nexus_id = i.nexus_id AND c.seq = i.version
         WHERE i.nexus_id = ? AND i.deleted = 0 AND json_extract(c.record, '$.sha256') IS NOT NULL)
       AND sha256 NOT IN (SELECT sha256 FROM capture WHERE nexus_id = ?)`,
  )
  const sweepCaptures = db.prepare('DELETE FROM capture WHERE nexus_id = ? AND at_ms < ?')
  const sweepRequests = db.prepare('DELETE FROM request WHERE nexus_id = ? AND at_ms < ?')
  const rememberRequest = db.prepare(
    'INSERT OR REPLACE INTO request (nexus_id, request_id, reply, at_ms) VALUES (?, ?, ?, ?)',
  )

  const hasBlob = (nexusId: string, sha256: string): boolean =>
    hasStatement.get(nexusId, sha256) !== undefined

  const seqOf = (nexusId: string): number | null => {
    const row = seqStatement.get(nexusId) as { seq: number } | undefined
    return row ? row.seq : null
  }

  const liveVersion = (nexusId: string, path: string): number | null => {
    const row = itemStatement.get(nexusId, path) as ItemRow | undefined
    return row !== undefined && row.deleted === 0 ? row.version : null
  }

  const readHead = (nexusId: string, path: string): Wire.Change | null => {
    const row = headStatement.get(nexusId, path) as ChangeRow | undefined
    return row ? decode(row) : null
  }

  function apply(
    nexusId: string,
    device: string,
    body: Wire.StoreBody,
    atMs: number,
    start: number,
  ): Wire.StoreReply {
    let seq = start
    const stale = (path: string, at: string = path): Wire.StoreOutcome => ({
      path,
      ok: false,
      why: 'stale',
      head: readHead(nexusId, at),
    })
    const missingBlob = (path: string): Wire.StoreOutcome => ({
      path,
      ok: false,
      why: 'missing-blob',
    })
    const append = (
      kind: Wire.Change['kind'],
      path: string,
      from: string | null,
      record: string | null,
    ): Wire.StoreOutcome => {
      bumpStatement.run(nexusId)
      seq += 1
      insertChange.run(nexusId, seq, kind, path, from, record, device, atMs)
      upsertItem.run(nexusId, path, seq, kind === 'delete' ? 1 : 0)
      if (from !== null) upsertItem.run(nexusId, from, seq, 1)
      return { path, ok: true, version: seq }
    }

    const settle = (change: Wire.StoreChange): Wire.StoreOutcome => {
      switch (change.kind) {
        case 'capture': {
          const { path, sha256 } = change.record
          if (!hasBlob(nexusId, sha256)) return missingBlob(path)
          insertCapture.run(nexusId, path, sha256, atMs, JSON.stringify(change.record))
          return { path, ok: true, version: seq }
        }
        case 'write': {
          const { path, sha256 } = change.record
          if (liveVersion(nexusId, path) !== change.base) return stale(path)
          if (!hasBlob(nexusId, sha256)) return missingBlob(path)
          return append('write', path, null, JSON.stringify(change.record))
        }
        case 'delete':
          if (liveVersion(nexusId, change.path) !== change.base) return stale(change.path)
          return append('delete', change.path, null, null)
        case 'rename': {
          if (liveVersion(nexusId, change.from) !== change.base)
            return stale(change.path, change.from)
          if (liveVersion(nexusId, change.path) !== null) return stale(change.path)
          const { record } = recordStatement.get(nexusId, change.base) as { record: string }
          return append('rename', change.path, change.from, record)
        }
      }
    }

    const outcomes = body.changes.map(settle)
    return { outcomes, seq }
  }

  return {
    putBlob: (nexusId: string, sha256: string, bytes: Buffer, atMs: number): void => {
      putStatement.run(nexusId, sha256, bytes, atMs)
    },

    readBlob: (nexusId: string, sha256: string): Buffer | null => {
      const row = readStatement.get(nexusId, sha256) as { bytes: Uint8Array } | undefined
      return row ? Buffer.from(row.bytes) : null
    },

    seqOf,

    readChanges: (nexusId: string, cursor: number, heads = false, limit = 200): Wire.PullReply => {
      const read = heads ? headsStatement : changesStatement
      const rows = read.all(nexusId, cursor, limit + 1) as unknown as ChangeRow[]
      const hasMore = rows.length > limit
      const changes = (hasMore ? rows.slice(0, limit) : rows).map(decode)
      return { changes, cursor: changes.at(-1)?.seq ?? cursor, hasMore }
    },

    sweep: (nexusId: string, historyDays: number, nowMs: number): void => {
      const cutoff = nowMs - historyDays * 86_400_000
      sweepBlobs.run(nexusId, cutoff, nexusId, nexusId)
      sweepCaptures.run(nexusId, cutoff)
      sweepRequests.run(nexusId, cutoff)
    },

    applyStore: (
      nexusId: string,
      device: string,
      body: Wire.StoreBody,
      atMs: number,
    ): Wire.StoreReply | null => {
      const start = seqOf(nexusId)
      if (start === null) return null
      const known = requestStatement.get(nexusId, body.requestId) as { reply: string } | undefined
      if (known) return JSON.parse(known.reply) as Wire.StoreReply
      db.exec('BEGIN')
      try {
        const reply = apply(nexusId, device, body, atMs, start)
        rememberRequest.run(nexusId, body.requestId, JSON.stringify(reply), atMs)
        db.exec('COMMIT')
        return reply
      } catch (e) {
        db.exec('ROLLBACK')
        throw e
      }
    },
  }
}
