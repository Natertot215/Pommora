import { mkdir, rm, utimes, writeFile } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TransportRequest } from '../../Contract/handlers'
import { join } from '../../Paths/posix'
import { machine } from '../../Platform/machine'
import { readValue } from '../../Platform/localState'
import { type CaptureStore, installStores, NO_STORES } from '../../Platform/stores'
import { tempRoot } from '../../Testing/hostFs'
import { memoryStores } from '../../Testing/memoryStores'
import { type FakeHub, hubSession, hubWrite } from '../../Testing/syncHub'
import type { TestSecrets } from '../../Testing/syncDevice'
import type { SyncScope } from '../Contract/wire'
import type { Ring } from '../Keys/ring'
import { readBase, upsertBase } from './base'
import { ringName } from './keyring'
import { advance, LONG_POLL_MS, pullOnce } from './pull'
import type { Session } from './session'

const REMOTE_MS = Date.UTC(2026, 8, 1, 12)
const LOCAL_MS = REMOTE_MS + 60_000

const utf8 = (text: string): Uint8Array => new TextEncoder().encode(text)
const page = (body: string): string => `---\nID: 01KVGMT8BFP350FZZXAMG1QDRA\n---\n\n${body}`

let root: string
let hub: FakeHub
let ring: Ring
let secrets: TestSecrets
let session: Session
let mem: ReturnType<typeof memoryStores>

const abs = (rel: string): string => join(root, rel)

const read = async (rel: string): Promise<string> =>
  new TextDecoder().decode((await machine().readBytes(abs(rel))) ?? new Uint8Array())

const write = async (rel: string, text: string, mtimeMs = LOCAL_MS): Promise<void> => {
  await mkdir(join(root, rel).split('/').slice(0, -1).join('/'), { recursive: true })
  await writeFile(abs(rel), utf8(text))
  await utimes(abs(rel), new Date(mtimeMs), new Date(mtimeMs))
}

const seedBase = (rel: string, text: string, version: number): void => {
  const bytes = utf8(text)
  upsertBase({
    path: rel,
    mtimeMs: REMOTE_MS,
    size: bytes.length,
    hash: machine().sha256Hex(bytes),
    blobSha: 'seeded',
    version,
    baseBytes: null,
  })
}

const pulls = (): TransportRequest[] => hub.sent.filter((req) => req.url.endsWith('/pull'))

const cursor = (): number => readValue<SyncScope>('sync')?.cursor ?? -1

beforeEach(async () => {
  root = tempRoot('pom-pull-')
  await mkdir(join(root, '.nexus'), { recursive: true })
  mem = memoryStores()
  installStores(mem.stores)
  const made = await hubSession(root)
  session = made.session
  hub = made.hub
  ring = made.ring
  secrets = made.secrets
  hub.atMs = REMOTE_MS
  hub.sent.length = 0
})

afterEach(async () => {
  installStores(NO_STORES)
  await rm(root, { recursive: true, force: true })
})

describe('advance', () => {
  it('never moves the cursor backwards', () => {
    advance(session, 5)
    advance(session, 3)
    expect(session.target.cursor).toBe(5)
    expect(cursor()).toBe(5)
  })
})

describe('pullOnce', () => {
  it('lands two pulled writes in order and advances the cursor per change', async () => {
    await hubWrite(hub, ring, 'Notes/One.md', page('one'))
    await hubWrite(hub, ring, 'Notes/Two.md', page('two'))

    expect(await pullOnce(session, 0)).toBe('applied')

    expect(await read('Notes/One.md')).toBe(page('one'))
    expect(await read('Notes/Two.md')).toBe(page('two'))
    expect(readBase('Notes/One.md')?.version).toBe(1)
    expect(cursor()).toBe(2)
    expect(session.target.cursor).toBe(2)
  })

  it('lands nothing for a change the base already holds', async () => {
    const seq = await hubWrite(hub, ring, 'Notes/One.md', page('one'))
    seedBase('Notes/One.md', page('held'), seq)

    expect(await pullOnce(session, 0)).toBe('applied')

    expect(await machine().stat(abs('Notes/One.md'))).toBeNull()
    expect(cursor()).toBe(seq)
  })

  it('pushes a dirty path before landing over it', async () => {
    const first = await hubWrite(hub, ring, 'Notes/One.md', page('first'), REMOTE_MS)
    await hubWrite(hub, ring, 'Notes/One.md', page('remote'), REMOTE_MS)
    seedBase('Notes/One.md', page('base'), first)
    await write('Notes/One.md', page('local'), LOCAL_MS)

    expect(await pullOnce(session, 0)).toBe('applied')

    expect(hub.sent.some((req) => req.url.endsWith('/store'))).toBe(true)
    expect(await read('Notes/One.md')).toBe(page('local'))
    expect(readBase('Notes/One.md')?.version).toBe(hub.seq)
  })

  it('leaves a dirty file whose push failed alone and keeps the cursor', async () => {
    const first = await hubWrite(hub, ring, 'Notes/One.md', page('first'), REMOTE_MS)
    await hubWrite(hub, ring, 'Notes/One.md', page('remote'), REMOTE_MS)
    seedBase('Notes/One.md', page('base'), first)
    await write('Notes/One.md', page('local'), LOCAL_MS)
    hub.intercept = (req) => (req.url.endsWith('/store') ? 'throw' : null)

    expect(await pullOnce(session, 0)).toBe('error')

    expect(await read('Notes/One.md')).toBe(page('local'))
    expect(cursor()).toBe(first)
    expect([...session.failed]).toEqual(['Notes/One.md'])
  })

  it('captures the local bytes a declined push left under a landing', async () => {
    const added = vi.spyOn(mem.stores.captures as CaptureStore, 'addCapture')
    const first = await hubWrite(hub, ring, 'Notes/One.md', page('first'), REMOTE_MS)
    await hubWrite(hub, ring, 'Notes/One.md', page('remote'), REMOTE_MS)
    seedBase('Notes/One.md', page('base'), first)
    await write('Notes/One.md', 'no identity, so no push', LOCAL_MS)

    expect(await pullOnce(session, 0)).toBe('applied')

    expect(await read('Notes/One.md')).toBe(page('remote'))
    const [path, , reason, losing] = added.mock.calls[0]
    expect([path, reason]).toEqual(['Notes/One.md', 'local-lost'])
    expect(new TextDecoder().decode(losing)).toBe('no identity, so no push')
  })

  it('answers resync when the cursor is past the head', async () => {
    session.target = { ...session.target, cursor: 9 }

    expect(await pullOnce(session, 0)).toBe('resync')
    expect(cursor()).toBe(0)
    expect(session.target.cursor).toBe(0)
  })

  it('waits out the long poll before the transport times out', async () => {
    await pullOnce(session, LONG_POLL_MS)
    expect(pulls()[0].timeoutMs).toBe(LONG_POLL_MS + 5_000)
  })

  it('forgets its keys and answers revoked on not-found with a cached ring', async () => {
    await secrets.set(ringName(session.nexusId), '[]')
    hub.intercept = (req) =>
      req.url.endsWith('/pull') ? { status: 404, body: '{"error":"not-found"}' } : null

    expect(await pullOnce(session, 0)).toBe('revoked')
    expect(await secrets.get(ringName(session.nexusId))).toBeNull()
  })

  it('answers error on a refusal this device was never approved for', async () => {
    hub.intercept = (req) =>
      req.url.endsWith('/pull') ? { status: 404, body: '{"error":"not-found"}' } : null

    expect(await pullOnce(session, 0)).toBe('error')
  })
})
