import type * as Wire from '@pommora/core/Sync/Contract/wire'
import type { Identity, Routes } from '../authority.ts'
import { wait, wake } from '../feed.ts'
import type { Store } from '../Store/open.ts'
import { KEY_ID_MAX, refuse, type Reply, SHA256, text, whole } from '../wire.ts'

const MAX_CHANGES = 1000
const PATH_MAX = 1024

function itemPath(value: unknown): value is string {
  if (!text(value, PATH_MAX) || value.startsWith('/') || value.normalize('NFC') !== value) {
    return false
  }
  return value
    .split('/')
    .every((segment) => segment.length > 0 && segment !== '.' && segment !== '..')
}

function itemRecord(value: unknown): Wire.ItemRecord | null {
  const r = value as Partial<Wire.ItemRecord> | null
  if (!r || typeof r !== 'object' || !itemPath(r.path)) return null
  if (!whole(r.mtimeMs, Number.MAX_SAFE_INTEGER) || !whole(r.size, Number.MAX_SAFE_INTEGER)) {
    return null
  }
  if (!text(r.keyId, KEY_ID_MAX) || !text(r.sha256, 64) || !SHA256.test(r.sha256)) return null
  return { path: r.path, mtimeMs: r.mtimeMs, size: r.size, keyId: r.keyId, sha256: r.sha256 }
}

function storeChange(value: unknown): Wire.StoreChange | null {
  if (!value || typeof value !== 'object') return null
  const c = value as Record<string, unknown>
  const base = whole(c.base, Number.MAX_SAFE_INTEGER) ? c.base : null
  switch (c.kind) {
    case 'capture': {
      const record = itemRecord(c.record)
      return record === null ? null : { kind: 'capture', record }
    }
    case 'write': {
      const record = itemRecord(c.record)
      if (record === null || (base === null && c.base !== null)) return null
      return { kind: 'write', base, record }
    }
    case 'delete':
      if (base === null || !itemPath(c.path)) return null
      return { kind: 'delete', base, path: c.path }
    case 'rename':
      if (base === null || !itemPath(c.path) || !itemPath(c.from) || c.from === c.path) return null
      return { kind: 'rename', base, from: c.from, path: c.path }
    default:
      return null
  }
}

export function itemRoutes(store: Store) {
  return {
    store: (id: Identity, body: unknown): Reply => {
      const b = body as Partial<Wire.StoreBody> | null
      if (!text(b?.requestId, 128) || !Array.isArray(b.changes)) return refuse(400, 'malformed')
      if (b.changes.length < 1 || b.changes.length > MAX_CHANGES) return refuse(400, 'malformed')
      const changes: Wire.StoreChange[] = []
      for (const raw of b.changes) {
        const change = storeChange(raw)
        if (!change) return refuse(400, 'malformed')
        changes.push(change)
      }
      const reply = store.log.applyStore(
        id.nexusId,
        id.device,
        { nexusId: id.nexusId, requestId: b.requestId, changes },
        Date.now(),
      )
      if (reply === null) return refuse(404, 'not-found')
      if (reply.outcomes.some((outcome) => outcome.ok)) wake(id.nexusId, reply.seq)
      return { status: 200, body: reply }
    },

    pull: async (id: Identity, body: unknown): Promise<Reply> => {
      const b = body as Partial<Wire.PullBody> | null
      if (!whole(b?.cursor, Number.MAX_SAFE_INTEGER)) return refuse(400, 'malformed')
      const waitMs = b.waitMs
      if (waitMs !== undefined && !whole(waitMs, Number.MAX_SAFE_INTEGER)) {
        return refuse(400, 'malformed')
      }
      const seq = store.log.seqOf(id.nexusId)
      if (seq === null) return refuse(404, 'not-found')
      if (b.cursor > seq) return refuse(409, 'resync', { seq })
      const first = store.log.readChanges(id.nexusId, b.cursor)
      if (first.changes.length > 0 || waitMs === undefined || waitMs === 0) {
        return { status: 200, body: first }
      }
      await wait(id.nexusId, b.cursor, waitMs)
      return { status: 200, body: store.log.readChanges(id.nexusId, b.cursor) }
    },
  } satisfies Routes<'store' | 'pull'>
}
