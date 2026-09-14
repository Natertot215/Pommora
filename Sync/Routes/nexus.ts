import type * as Wire from '@pommora/core/Sync/Contract/wire'
import type { Identity, Routes } from '../authority.ts'
import type { Store } from '../Store/open.ts'
import { KEY_ID_MAX, permits, refuse, type Reply, text, whole } from '../wire.ts'

const MAX_ENTRIES = 256

function ringEntry(value: unknown): Wire.RingEntry | null {
  const e = value as Partial<Wire.RingEntry> | null
  if (!e || typeof e !== 'object') return null
  if (!text(e.keyId, KEY_ID_MAX) || !text(e.holder, 128) || !text(e.wrapped, 8192)) return null
  if (!whole(e.createdMs, Number.MAX_SAFE_INTEGER)) return null
  return { keyId: e.keyId, holder: e.holder, wrapped: e.wrapped, createdMs: e.createdMs }
}

function ringEntries(value: unknown, min: number): Wire.RingEntry[] | null {
  if (!Array.isArray(value) || value.length < min || value.length > MAX_ENTRIES) return null
  const entries: Wire.RingEntry[] = []
  const seen = new Set<string>()
  for (const raw of value) {
    const entry = ringEntry(raw)
    if (!entry) return null
    const key = `${entry.keyId} ${entry.holder}`
    if (seen.has(key)) return null
    seen.add(key)
    entries.push(entry)
  }
  return entries
}

function createRecord(value: unknown): Omit<Wire.InfoRecord, 'version'> | null {
  const c = value as Partial<Wire.InfoRecord> | null
  if (!c || typeof c !== 'object' || c.protocol !== 1) return null
  const kdf = c.kdf as Partial<Wire.KdfParams> | undefined
  if (kdf?.hash !== 'SHA-256' || !text(kdf.salt, 256)) return null
  if (!whole(kdf.iterations, 10_000_000) || kdf.iterations < 1) return null
  if (!whole(c.historyDays, 36_500) || c.historyDays < 1) return null
  const ring = ringEntries(c.ring, 0)
  if (!ring) return null
  return {
    protocol: 1,
    kdf: { hash: 'SHA-256', iterations: kdf.iterations, salt: kdf.salt },
    historyDays: c.historyDays,
    ring,
  }
}

export function nexusRoutes(store: Store) {
  return {
    info: (id: Identity, body: unknown): Reply => {
      const create = (body as Partial<Wire.InfoBody> | null)?.create
      if (create === undefined) {
        const existing = store.nexus.readInfo(id.nexusId)
        return existing ? { status: 200, body: { info: existing } } : refuse(404, 'not-found')
      }
      if (!permits(id.role, 'owner')) return refuse(404, 'not-found')
      const record = createRecord(create)
      if (!record) return refuse(400, 'malformed')
      const made = store.nexus.createInfo(id.nexusId, record)
      return made ? { status: 200, body: { info: made } } : refuse(409, 'exists')
    },

    ring: (id: Identity, body: unknown): Reply => {
      const b = body as Partial<Wire.RingBody> | null
      const add = ringEntries(b?.add, 1)
      if (!add || !whole(b?.base, Number.MAX_SAFE_INTEGER)) return refuse(400, 'malformed')
      const outcome = store.nexus.appendRing(id.nexusId, b.base, add)
      switch (outcome.kind) {
        case 'absent':
          return refuse(404, 'not-found')
        case 'stale':
          return refuse(409, 'stale', { info: outcome.info })
        case 'exists':
          return refuse(409, 'exists', { info: outcome.info })
        case 'ok':
          return { status: 200, body: { info: outcome.info } }
      }
    },
  } satisfies Routes<'info' | 'ring'>
}
