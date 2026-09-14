import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type * as Wire from '@pommora/core/Sync/Contract/wire'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { STORE_FILE } from './Store/open.ts'
import { boot, connectBody, NEXUS, signer } from './Testing/hub.ts'
import { sha256Hex } from './wire.ts'

const BYTES = Buffer.from('ciphertext')
const DIGEST = sha256Hex(BYTES)

let hub: Awaited<ReturnType<typeof boot>>
let request = 0
let head = 0

const owner = signer('Owner Mac')

const record = (path: string): Wire.ItemRecord => ({
  path,
  mtimeMs: 1_700_000_000_000,
  size: BYTES.length,
  keyId: 'k1',
  sha256: DIGEST,
})

async function push(
  changes: Wire.StoreChange[],
  requestId?: string,
): Promise<{ status: number; reply: Wire.StoreReply }> {
  request += 1
  const outcome = await owner.call('/store', {
    nexusId: NEXUS,
    requestId: requestId ?? `r${request}`,
    changes,
  })
  const reply = outcome.body as Wire.StoreReply
  if (typeof reply?.seq === 'number') head = reply.seq
  return { status: outcome.status, reply }
}

async function pull(cursor: number, waitMs?: number): Promise<Wire.PullReply> {
  const outcome = await owner.call('/pull', { nexusId: NEXUS, cursor, ...(waitMs && { waitMs }) })
  return outcome.body as Wire.PullReply
}

function withDb<T>(read: (db: DatabaseSync) => T): T {
  const db = new DatabaseSync(join(hub.dataDir, STORE_FILE))
  try {
    return read(db)
  } finally {
    db.close()
  }
}

const only = (reply: Wire.StoreReply): Wire.StoreOutcome => reply.outcomes[0]

const countChanges = (): number =>
  withDb((db) => (db.prepare('SELECT COUNT(*) AS n FROM change').get() as { n: number }).n)

beforeAll(async () => {
  hub = await boot()
  await owner.call('/connect', connectBody(owner, NEXUS))
  await owner.call('/info', {
    nexusId: NEXUS,
    create: {
      protocol: 1,
      kdf: { hash: 'SHA-256', iterations: 600_000, salt: 'c2FsdA' },
      historyDays: 30,
      ring: [],
    },
  })
  await owner.put(NEXUS, 'k1', BYTES)
})

afterAll(async () => {
  await hub.close()
})

describe('the hub change log', () => {
  it('refuses a store against a Nexus with no info record', async () => {
    const other = '01ARZ3NDEKTSV4RRFFQ69G5FB1'
    await owner.call('/connect', connectBody(owner, other))
    const outcome = await owner.call('/store', {
      nexusId: other,
      requestId: 'r0',
      changes: [{ kind: 'write', base: null, record: record('a.md') }],
    })
    expect(outcome.status).toBe(404)
  })

  it('refuses a malformed path', async () => {
    const outcome = await owner.call('/store', {
      nexusId: NEXUS,
      requestId: 'bad',
      changes: [{ kind: 'write', base: null, record: record('../escape.md') }],
    })
    expect(outcome.status).toBe(400)
  })

  it('refuses a write whose blob is absent', async () => {
    const pushed = await push([
      { kind: 'write', base: null, record: { ...record('ghost.md'), sha256: 'a'.repeat(64) } },
    ])
    expect(only(pushed.reply)).toEqual({ path: 'ghost.md', ok: false, why: 'missing-blob' })
    expect(pushed.reply.seq).toBe(0)
  })

  it('writes a fresh path at version one and the next write at two', async () => {
    const first = await push([{ kind: 'write', base: null, record: record('Notes/one.md') }])
    expect(only(first.reply)).toEqual({ path: 'Notes/one.md', ok: true, version: 1 })
    const second = await push([{ kind: 'write', base: 1, record: record('Notes/one.md') }])
    expect(only(second.reply)).toEqual({ path: 'Notes/one.md', ok: true, version: 2 })
    expect(second.reply.seq).toBe(2)
  })

  it('refuses a stale base with the head', async () => {
    const stale = await push([{ kind: 'write', base: 1, record: record('Notes/one.md') }])
    const outcome = only(stale.reply)
    expect(outcome.ok).toBe(false)
    expect(outcome).toMatchObject({ why: 'stale' })
    expect((outcome as { head: Wire.Change }).head.seq).toBe(2)
  })

  it('moves the head on a rename and carries the record at the new path', async () => {
    const moved = await push([
      { kind: 'rename', base: 2, from: 'Notes/one.md', path: 'Notes/two.md' },
    ])
    expect(only(moved.reply)).toEqual({ path: 'Notes/two.md', ok: true, version: 3 })
    const head = (await push([{ kind: 'write', base: 1, record: record('Notes/two.md') }])).reply
      .outcomes[0] as { head: Wire.Change }
    expect(head.head.kind).toBe('rename')
    expect(head.head.record?.path).toBe('Notes/two.md')
    expect(head.head.from).toBe('Notes/one.md')
  })

  it('answers a write against the old path with the rename as its head', async () => {
    const pushed = await push([{ kind: 'write', base: 2, record: record('Notes/one.md') }])
    const outcome = only(pushed.reply) as { why: string; head: Wire.Change }
    expect(outcome.why).toBe('stale')
    expect(outcome.head.kind).toBe('rename')
    expect(outcome.head.path).toBe('Notes/two.md')
  })

  it('refuses a delete on a stale base', async () => {
    const pushed = await push([{ kind: 'delete', base: 1, path: 'Notes/two.md' }])
    expect(only(pushed.reply)).toMatchObject({ why: 'stale' })
    const gone = await push([{ kind: 'delete', base: 3, path: 'Notes/two.md' }])
    expect(only(gone.reply)).toEqual({ path: 'Notes/two.md', ok: true, version: 4 })
  })

  it('stores a capture without advancing the sequence', async () => {
    const before = (await push([{ kind: 'write', base: null, record: record('Notes/kept.md') }]))
      .reply.seq
    const captured = await push([{ kind: 'capture', record: record('Notes/kept.md') }])
    expect(only(captured.reply)).toEqual({ path: 'Notes/kept.md', ok: true, version: before })
    expect(captured.reply.seq).toBe(before)
  })

  it('answers a replayed request id from the stored reply', async () => {
    const first = await push(
      [{ kind: 'write', base: null, record: record('Notes/replay.md') }],
      'x1',
    )
    const changes = countChanges()
    const again = await push(
      [{ kind: 'write', base: null, record: record('Notes/replay.md') }],
      'x1',
    )
    expect(again.reply).toEqual(first.reply)
    expect(countChanges()).toBe(changes)
  })
})

describe('the hub feed', () => {
  it('pulls two stored changes in order', async () => {
    const pulled = await pull(head - 2)
    expect(pulled.changes.map((c) => c.seq)).toEqual([head - 1, head])
    expect(pulled.cursor).toBe(head)
    expect(pulled.hasMore).toBe(false)
  })

  it('answers resync to a cursor past the head', async () => {
    const outcome = await owner.call('/pull', { nexusId: NEXUS, cursor: head + 100 })
    expect(outcome.status).toBe(409)
    expect(outcome.body).toEqual({ error: 'resync', seq: head })
  })

  it('wakes a waiting pull within a hundred milliseconds of a store', async () => {
    const cursor = head
    const started = performance.now()
    const waiting = pull(cursor, 5_000)
    await new Promise((resolve) => setTimeout(resolve, 20))
    await push([{ kind: 'write', base: null, record: record('Notes/woken.md') }])
    const pulled = await waiting
    const elapsed = performance.now() - started
    console.log(`the long poll woke in ${elapsed.toFixed(1)} ms`)
    expect(elapsed).toBeLessThan(100)
    expect(pulled.changes.map((c) => c.path)).toEqual(['Notes/woken.md'])
  })

  it('pages a third store of 250 changes across two pulls', async () => {
    const cursor = head
    await push(
      Array.from({ length: 250 }, (_, n) => ({
        kind: 'write' as const,
        base: null,
        record: record(`Bulk/${n}.md`),
      })),
    )
    const first = await pull(cursor)
    expect(first.changes).toHaveLength(200)
    expect(first.hasMore).toBe(true)
    expect(first.cursor).toBe(cursor + 200)
    const second = await pull(first.cursor)
    expect(second.changes).toHaveLength(50)
    expect(second.hasMore).toBe(false)
    expect(second.cursor).toBe(head)
  })
})

describe('the hub retention sweep', () => {
  const orphanOld = Buffer.from('old orphan')
  const orphanNew = Buffer.from('new orphan')
  const captured = Buffer.from('captured bytes')
  const ancient = Date.now() - 40 * 86_400_000

  const digests = {
    head: DIGEST,
    orphanOld: sha256Hex(orphanOld),
    orphanNew: sha256Hex(orphanNew),
    captured: sha256Hex(captured),
  }

  const held = (): string[] =>
    withDb((db) =>
      (db.prepare('SELECT sha256 FROM blob WHERE nexus_id = ?').all(NEXUS) as { sha256: string }[])
        .map((r) => r.sha256)
        .sort(),
    )

  it('sweeps an old orphaned blob and keeps the head, a fresh orphan, and a captured blob', async () => {
    await owner.put(NEXUS, 'k1', orphanOld)
    await owner.put(NEXUS, 'k1', orphanNew)
    await owner.put(NEXUS, 'k1', captured)
    await push([
      { kind: 'capture', record: { ...record('Notes/kept.md'), sha256: digests.captured } },
    ])
    withDb((db) => {
      db.prepare('UPDATE blob SET at_ms = ? WHERE nexus_id = ? AND sha256 IN (?, ?)').run(
        ancient,
        NEXUS,
        digests.orphanOld,
        digests.captured,
      )
      db.prepare('UPDATE blob SET at_ms = ? WHERE nexus_id = ? AND sha256 = ?').run(
        ancient,
        NEXUS,
        digests.head,
      )
    })
    expect(held()).toContain(digests.orphanOld)

    await hub.close()
    hub = await boot({ dataDir: hub.dataDir })

    const after = held()
    expect(after).not.toContain(digests.orphanOld)
    expect(after).toContain(digests.head)
    expect(after).toContain(digests.orphanNew)
    expect(after).toContain(digests.captured)
  })
})
