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
    `INSERT OR IGNORE INTO blob (nexus_id, sha256, key_id, size, bytes, at_ms)
     VALUES (?, ?, ?, ?, ?, ?)`,
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
  const moveItem = db.prepare(
    'UPDATE item SET path = ?, version = ? WHERE nexus_id = ? AND path = ?',
  )
  const dropItem = db.prepare('DELETE FROM item WHERE nexus_id = ? AND path = ?')
  const insertChange = db.prepare(
    `INSERT INTO change (nexus_id, seq, kind, path, from_path, record, device, at_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const headStatement = db.prepare(
    `SELECT seq, kind, path, from_path, record, device, at_ms FROM change
     WHERE nexus_id = ? AND (path = ? OR from_path = ?) ORDER BY seq DESC LIMIT 1`,
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

  const liveOf = (nexusId: string, path: string): ItemRow | null => {
    const row = itemStatement.get(nexusId, path) as ItemRow | undefined
    return row !== undefined && row.deleted === 0 ? row : null
  }

  const readHead = (nexusId: string, path: string): Wire.Change | null => {
    const row = headStatement.get(nexusId, path, path) as ChangeRow | undefined
    return row ? decode(row) : null
  }

  function apply(
    nexusId: string,
    device: string,
    body: Wire.StoreBody,
    atMs: number,
    start: number,
  ): Wire.StoreReply {
    const outcomes: Wire.StoreOutcome[] = []
    const stale = (path: string, at: string = path): Wire.StoreOutcome => ({
      path,
      ok: false,
      why: 'stale',
      head: readHead(nexusId, at),
    })
    let seq = start

    for (const change of body.changes) {
      if (change.kind === 'capture') {
        const { path, sha256 } = change.record
        if (!hasBlob(nexusId, sha256)) {
          outcomes.push({ path, ok: false, why: 'missing-blob' })
          continue
        }
        insertCapture.run(nexusId, path, sha256, atMs, JSON.stringify(change.record))
        outcomes.push({ path, ok: true, version: seq })
        continue
      }

      const path = change.kind === 'write' ? change.record.path : change.path
      const source = change.kind === 'rename' ? change.from : path
      const live = liveOf(nexusId, source)
      if (change.kind === 'write' && change.base === null) {
        if (live !== null) {
          outcomes.push(stale(path))
          continue
        }
      } else if (live === null || live.version !== change.base) {
        outcomes.push(stale(path, source))
        continue
      }
      if (change.kind === 'write' && !hasBlob(nexusId, change.record.sha256)) {
        outcomes.push({ path, ok: false, why: 'missing-blob' })
        continue
      }
      if (change.kind === 'rename' && liveOf(nexusId, path) !== null) {
        outcomes.push(stale(path))
        continue
      }

      bumpStatement.run(nexusId)
      seq += 1
      if (change.kind === 'write') {
        insertChange.run(
          nexusId,
          seq,
          'write',
          path,
          null,
          JSON.stringify(change.record),
          device,
          atMs,
        )
        upsertItem.run(nexusId, path, seq, 0)
      } else if (change.kind === 'delete') {
        insertChange.run(nexusId, seq, 'delete', path, null, null, device, atMs)
        upsertItem.run(nexusId, path, seq, 1)
      } else {
        const { record } = recordStatement.get(nexusId, change.base) as { record: string }
        dropItem.run(nexusId, path)
        moveItem.run(path, seq, nexusId, change.from)
        insertChange.run(nexusId, seq, 'rename', path, change.from, record, device, atMs)
      }
      outcomes.push({ path, ok: true, version: seq })
    }

    return { outcomes, seq }
  }

  return {
    putBlob: (
      nexusId: string,
      sha256: string,
      keyId: string,
      bytes: Buffer,
      atMs: number,
    ): void => {
      putStatement.run(nexusId, sha256, keyId, bytes.length, bytes, atMs)
    },

    readBlob: (nexusId: string, sha256: string): Buffer | null => {
      const row = readStatement.get(nexusId, sha256) as { bytes: Uint8Array } | undefined
      return row ? Buffer.from(row.bytes) : null
    },

    seqOf,

    readChanges: (nexusId: string, cursor: number, limit = 200): Wire.PullReply => {
      const rows = changesStatement.all(nexusId, cursor, limit + 1) as unknown as ChangeRow[]
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
