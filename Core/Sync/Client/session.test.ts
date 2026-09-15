import { mkdir, rm, writeFile } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HostContext, TransportReply, TransportRequest } from '../../Contract/handlers'
import { join } from '../../Paths/posix'
import { machine } from '../../Platform/machine'
import { readValue, writeValue } from '../../Platform/localState'
import { installStores, NO_STORES, type Stores } from '../../Platform/stores'
import { tempRoot } from '../../Testing/hostFs'
import { memoryStores } from '../../Testing/memoryStores'
import { type FakeHub, hubHost, hubWrite } from '../../Testing/syncHub'
import { TEST_KDF, testKeys } from '../../Testing/syncDevice'
import type { Ring } from '../Keys/ring'
import type { SyncStatus } from '../Contract/wire'
import { readAllBases, readBase, upsertBase } from './base'
import { recordWrite } from '../../Files/writeEcho'
import { ringName } from './keyring'
import { currentSession, startSession, stopSession, syncNow } from './session'
import { DEBOUNCE_MS, dirtyPending } from './tap'

const NEXUS = 'nx'
const ADDRESS = 'http://127.0.0.1:7473'
const REMOTE_MS = Date.UTC(2026, 8, 1, 12)

const utf8 = (text: string): Uint8Array => new TextEncoder().encode(text)
const page = (body: string): string => `---\nID: 01KVGMT8BFP350FZZXAMG1QDRA\n---\n\n${body}`

let root: string
let hub: FakeHub
let ring: Ring
let ctx: HostContext
let pushes: Array<[string, unknown]>
let stores: Stores

const abs = (rel: string): string => join(root, rel)

const write = async (rel: string, text: string): Promise<void> => {
  await mkdir(join(root, rel).split('/').slice(0, -1).join('/'), { recursive: true })
  await writeFile(abs(rel), utf8(text))
}

const statuses = (): SyncStatus[] =>
  pushes.filter(([k]) => k === 'sync:changed').map(([, payload]) => payload as SyncStatus)

const sent = (suffix: string): TransportRequest[] =>
  hub.sent.filter((req) => req.url.endsWith(suffix))

const turn = (ms = 60): Promise<void> => new Promise((wake) => setTimeout(wake, ms))

beforeEach(async () => {
  root = tempRoot('pom-session-')
  await mkdir(join(root, '.nexus'), { recursive: true })
  stores = memoryStores().stores
  installStores(stores)
  const made = await hubHost({ nexusId: NEXUS })
  hub = made.hub
  ring = made.ring
  ctx = made.ctx
  pushes = made.pushes
  hub.atMs = REMOTE_MS
  writeValue('sync', { address: ADDRESS, pin: null, cursor: 0 })
})

afterEach(async () => {
  stopSession({ push: () => {} })
  installStores(NO_STORES)
  vi.useRealTimers()
  await rm(root, { recursive: true, force: true })
})

describe('startSession', () => {
  it('starts an empty base table from cursor zero even when the hub log goes unanswered', async () => {
    writeValue('sync', { address: ADDRESS, pin: null, cursor: 7 })
    hub.intercept = (req) => (req.url.endsWith('/pull') ? { status: 500, body: '' } : null)

    await startSession(ctx, root, NEXUS)

    expect(readValue<{ cursor: number }>('sync')?.cursor).toBe(0)
  })

  it('reconciles once when the base table is empty', async () => {
    await hubWrite(hub, ring, 'Notes/One.md', page('one'))

    await startSession(ctx, root, NEXUS)

    expect(await machine().readBytes(abs('Notes/One.md'))).not.toBeNull()
    expect(readBase('Notes/One.md')?.version).toBe(1)
    expect(currentSession()?.target.cursor).toBe(1)
  })

  it('starts once a pending device is approved', async () => {
    const info = hub.info
    hub.info = null
    vi.useFakeTimers()

    await startSession(ctx, root, NEXUS)
    expect(statuses().at(-1)?.reason).toBe('pending')
    expect(currentSession()).toBeNull()

    await vi.advanceTimersByTimeAsync(5_001)
    expect(statuses().at(-1)?.reason).toBe('pending')
    expect(currentSession()).toBeNull()

    hub.info = info
    await vi.advanceTimersByTimeAsync(10_001)
    vi.useRealTimers()
    await turn(150)
    expect(currentSession()).not.toBeNull()
  })

  it('serializes every chained push and pull, the long poll aside', async () => {
    let live = 0
    let peak = 0
    const inner = ctx.transport
    const longPoll = (req: TransportRequest): boolean =>
      req.url.endsWith('/pull') &&
      ((JSON.parse(String(req.body)) as { waitMs?: number }).waitMs ?? 0) > 0
    ctx.transport = async (req: TransportRequest): Promise<TransportReply> => {
      if (longPoll(req)) return inner(req)
      live += 1
      peak = Math.max(peak, live)
      try {
        return await inner(req)
      } finally {
        live -= 1
      }
    }
    await write('Notes/One.md', page('one'))

    await startSession(ctx, root, NEXUS)
    const self = currentSession()
    if (self === null) throw new Error('no session')
    self.failed.add('Notes/One.md')
    await Promise.all([syncNow(), syncNow()])

    expect(peak).toBe(1)
  })

  it('re-pushes a failed batch after the next answered pull', async () => {
    await write('Notes/One.md', page('one'))
    await startSession(ctx, root, NEXUS)
    const self = currentSession()
    if (self === null) throw new Error('no session')
    hub.sent.length = 0
    self.failed.add('Notes/One.md')
    upsertBase({
      path: 'Notes/One.md',
      mtimeMs: REMOTE_MS,
      size: 1,
      hash: 'stale',
      blobSha: 'stale',
      version: hub.seq,
      baseBytes: null,
    })

    await turn(120)

    expect(sent('/store').length).toBeGreaterThan(0)
    expect(self.failed.size).toBe(0)
  })

  it('rescopes before pushing when the settings file is dirty', async () => {
    await startSession(ctx, root, NEXUS)
    const self = currentSession()
    if (self === null) throw new Error('no session')
    upsertBase({
      path: 'Private/Secret.md',
      mtimeMs: REMOTE_MS,
      size: 1,
      hash: 'h',
      blobSha: 'b',
      version: 1,
      baseBytes: null,
    })
    await write('.nexus/settings.json', JSON.stringify({ excluded_folders: ['Private'] }))

    recordWrite(abs('.nexus/settings.json'))
    await turn(DEBOUNCE_MS + 300)

    expect(self.scope.excluded).toEqual(['Private'])
    expect(readAllBases().map((row) => row.path)).not.toContain('Private/Secret.md')
  })

  it('pushes then pulls on syncNow, failed paths included', async () => {
    await write('Notes/One.md', page('one'))
    await startSession(ctx, root, NEXUS)
    const self = currentSession()
    if (self === null) throw new Error('no session')
    await write('Notes/Two.md', page('two'))
    hub.sent.length = 0
    self.failed.add('Notes/Two.md')

    await syncNow()

    const order = hub.sent.map((req) => new URL(req.url).pathname)
    expect(order.at(-1)).toBe('/pull')
    expect(order).toContain('/store')
  })

  it('pushes a file edited while the app was closed at start', async () => {
    const seq = await hubWrite(hub, ring, 'Notes/One.md', page('one'))
    await write('Notes/One.md', page('edited while closed'))
    upsertBase({
      path: 'Notes/One.md',
      mtimeMs: REMOTE_MS,
      size: 1,
      hash: 'stale',
      blobSha: 'stale',
      version: seq,
      baseBytes: null,
    })

    await startSession(ctx, root, NEXUS)

    expect(sent('/store').length).toBeGreaterThan(0)
    expect(hub.seq).toBeGreaterThan(seq)
    expect(readBase('Notes/One.md')?.version).toBe(hub.seq)
  })

  it('pushes while a long poll is out', async () => {
    const idle = { status: 200, body: JSON.stringify({ changes: [], cursor: 0, hasMore: false }) }
    let outstanding = 0
    let released = false
    let release = (): void => {}
    await startSession(ctx, root, NEXUS)
    const self = currentSession()
    if (self === null) throw new Error('no session')
    hub.intercept = (req) => {
      if (!req.url.endsWith('/pull')) return null
      const waitMs = (JSON.parse(String(req.body)) as { waitMs?: number }).waitMs ?? 0
      if (waitMs === 0) return null
      outstanding += 1
      return new Promise((resolve) => {
        release = () => {
          released = true
          resolve(idle)
        }
      })
    }
    while (outstanding === 0) await turn(20)
    await write('Notes/Late.md', page('late'))
    hub.sent.length = 0
    self.failed.add('Notes/Late.md')

    await syncNow()

    expect(released).toBe(false)
    expect(sent('/store').length).toBeGreaterThan(0)
    expect(readBase('Notes/Late.md')?.version).toBe(hub.seq)
    release()
  })

  it('reloads the ring once on an unknown key', async () => {
    await startSession(ctx, root, NEXUS)
    const rotated = await testKeys()
    hub.info = { version: 2, protocol: 1, kdf: TEST_KDF, historyDays: 90, ring: rotated.entries }
    await hubWrite(hub, rotated.ring, 'Notes/Rotated.md', page('rotated'))

    await turn(200)

    expect(await machine().readBytes(abs('Notes/Rotated.md'))).not.toBeNull()
    expect(currentSession()?.ring.keys[0].keyId).toBe(rotated.ring.keys[0].keyId)
    expect(statuses().at(-1)?.state).not.toBe('error')
  })

  it('reports a thrown push rather than rejecting its caller', async () => {
    await startSession(ctx, root, NEXUS)
    const self = currentSession()
    if (self === null) throw new Error('no session')
    self.failed.add('Notes/One.md')
    const stat = vi.spyOn(machine(), 'stat').mockRejectedValueOnce(new Error('boom'))

    await syncNow()

    expect(statuses().some((status) => status.state === 'error')).toBe(true)
    expect(currentSession()).not.toBeNull()
    stat.mockRestore()
  })

  it('reconciles when its own pull answers resync', async () => {
    await startSession(ctx, root, NEXUS)
    let refused = false
    hub.intercept = (req) => {
      if (!req.url.endsWith('/pull')) return null
      const waitMs = (JSON.parse(String(req.body)) as { waitMs?: number }).waitMs ?? 0
      if (waitMs > 0) return new Promise<never>(() => {})
      if (refused) return null
      refused = true
      return { status: 409, body: '{"error":"resync","seq":0}' }
    }
    await write('Notes/One.md', page('one'))
    hub.sent.length = 0

    await syncNow()

    expect(sent('/store').length).toBeGreaterThan(0)
    expect(readBase('Notes/One.md')?.version).toBe(hub.seq)
  })

  it('starts no session when a stop lands during the key fetch', async () => {
    let release = (): void => {}
    const held = new Promise<{ status: number; body: string }>((resolve) => {
      release = () => resolve({ status: 200, body: JSON.stringify({ info: hub.info }) })
    })
    hub.intercept = (req) => (req.url.endsWith('/info') ? held : null)

    const started = startSession(ctx, root, NEXUS)
    while (sent('/info').length === 0) await turn(20)
    await stopSession(ctx)
    release()
    await started

    expect(currentSession()).toBeNull()
  })

  it('starts from its cached ring when the hub is unreachable', async () => {
    await startSession(ctx, root, NEXUS)
    await stopSession(ctx)
    hub.intercept = () => 'throw'

    await startSession(ctx, root, NEXUS)

    expect(currentSession()).not.toBeNull()
    expect(statuses().at(-1)?.state).not.toBe('off')
    recordWrite(abs('Notes/One.md'))
    expect([...dirtyPending()]).toEqual(['Notes/One.md'])
  })

  it('learns a rotation made while it was down before its first decrypt', async () => {
    await startSession(ctx, root, NEXUS)
    await stopSession(ctx)
    const rotated = await testKeys()
    hub.info = { version: 2, protocol: 1, kdf: TEST_KDF, historyDays: 90, ring: rotated.entries }

    await startSession(ctx, root, NEXUS)

    expect(currentSession()?.ring.keys.map((key) => key.keyId)).toEqual([
      rotated.ring.keys[0].keyId,
    ])
  })

  it('holds the paths of a tap push that threw until the loop re-pushes them', async () => {
    await startSession(ctx, root, NEXUS)
    await write('Notes/One.md', page('one'))
    hub.sent.length = 0
    const stat = vi.spyOn(machine(), 'stat').mockRejectedValueOnce(new Error('boom'))

    recordWrite(abs('Notes/One.md'))
    await turn(DEBOUNCE_MS + 400)

    expect(
      sent('/store')
        .map((req) => String(req.body))
        .join(),
    ).toContain('Notes/One.md')
    expect(currentSession()).not.toBeNull()
    stat.mockRestore()
  })

  it('runs no queued work after stop', async () => {
    await startSession(ctx, root, NEXUS)
    const self = currentSession()
    if (self === null) throw new Error('no session')
    await write('Notes/Late.md', page('late'))
    self.failed.add('Notes/Late.md')
    hub.sent.length = 0

    const queued = syncNow()
    stopSession({ push: () => {} })
    await queued

    expect(sent('/store')).toEqual([])
    expect(readBase('Notes/Late.md')).toBeNull()
  })

  it('writes nothing when a long poll answers after its session stopped', async () => {
    let answer = (_reply: { status: number; body: string }): void => {}
    let outstanding = 0
    hub.intercept = (req) => {
      if (!req.url.endsWith('/pull')) return null
      if (((JSON.parse(String(req.body)) as { waitMs?: number }).waitMs ?? 0) === 0) return null
      outstanding += 1
      return new Promise((resolve) => {
        answer = resolve
      })
    }
    await startSession(ctx, root, NEXUS)
    await ctx.secrets.set(ringName(NEXUS), '[]')
    while (outstanding === 0) await turn(20)
    await stopSession({ push: () => {} })
    const rebound = { address: 'http://127.0.0.1:7474', pin: null, cursor: 3 }
    writeValue('sync', rebound)

    answer({ status: 409, body: '{"error":"resync"}' })
    await turn()

    expect(readValue('sync')).toEqual(rebound)
  })

  it('keeps its keys when a stopped session hears revoked from its long poll', async () => {
    let answer = (_reply: { status: number; body: string }): void => {}
    let outstanding = 0
    hub.intercept = (req) => {
      if (!req.url.endsWith('/pull')) return null
      if (((JSON.parse(String(req.body)) as { waitMs?: number }).waitMs ?? 0) === 0) return null
      outstanding += 1
      return new Promise((resolve) => {
        answer = resolve
      })
    }
    await startSession(ctx, root, NEXUS)
    await ctx.secrets.set(ringName(NEXUS), '[]')
    while (outstanding === 0) await turn(20)
    await stopSession({ push: () => {} })

    answer({ status: 404, body: '{"error":"not-found"}' })
    await turn()

    expect(await ctx.secrets.get(ringName(NEXUS))).toBe('[]')
  })

  it('stops and reports revoked when a pull answers revoked', async () => {
    await startSession(ctx, root, NEXUS)
    await ctx.secrets.set(ringName(NEXUS), '[]')
    hub.intercept = (req) =>
      req.url.endsWith('/pull') ? { status: 404, body: '{"error":"not-found"}' } : null

    await turn(120)

    expect(currentSession()).toBeNull()
    expect(await ctx.secrets.get(ringName(NEXUS))).toBeNull()
    expect(statuses().at(-1)).toEqual({
      state: 'off',
      reason: 'revoked',
      why: 'This device was revoked.',
    })
  })

  it('pushes sync:changed on every transition', async () => {
    await startSession(ctx, root, NEXUS)
    expect(statuses().map((status) => status.state)).toContain('syncing')
    expect(statuses().map((status) => status.state)).toContain('idle')
  })
})
