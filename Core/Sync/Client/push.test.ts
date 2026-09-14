import { mkdir, rm, utimes, writeFile } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TransportRequest } from '../../Contract/handlers'
import { join } from '../../Paths/posix'
import { machine } from '../../Platform/machine'
import { installStores, NO_STORES } from '../../Platform/stores'
import { tempRoot } from '../../Testing/hostFs'
import { memoryStores } from '../../Testing/memoryStores'
import { type FakeHub, hubDelete, hubRename, hubSession, hubWrite } from '../../Testing/syncHub'
import type { Change, StoreBody } from '../Contract/wire'
import type { Ring } from '../Keys/ring'
import { isDirty, readAllBases, readBase, upsertBase } from './base'
import { pushDirty, pushRename } from './push'
import type { Session } from './session'

const REMOTE_MS = Date.UTC(2026, 8, 1, 12)
const LOCAL_MS = REMOTE_MS + 60_000
const OLD_MS = REMOTE_MS - 60_000

const utf8 = (text: string): Uint8Array => new TextEncoder().encode(text)
const page = (body: string): string => `---\nID: 01KVGMT8BFP350FZZXAMG1QDRA\n---\n\n${body}`
const decode = (bytes: Uint8Array): string => new TextDecoder().decode(bytes)

let root: string
let hub: FakeHub
let ring: Ring
let pushes: Array<[string, unknown]>
let session: Session

const abs = (rel: string): string => join(root, rel)

const pathOf = (change: { kind: string; path?: string; record?: { path: string } }): string =>
  change.record?.path ?? change.path ?? ''

const read = async (rel: string): Promise<string> =>
  decode((await machine().readBytes(abs(rel))) ?? new Uint8Array())

const write = async (rel: string, text: string, mtimeMs = LOCAL_MS): Promise<Uint8Array> => {
  const bytes = utf8(text)
  await mkdir(join(root, rel).split('/').slice(0, -1).join('/'), { recursive: true })
  await writeFile(abs(rel), bytes)
  await utimes(abs(rel), new Date(mtimeMs), new Date(mtimeMs))
  return bytes
}

const seedBase = (rel: string, bytes: Uint8Array, version: number, merged = false): void => {
  upsertBase({
    path: rel,
    mtimeMs: OLD_MS,
    size: bytes.length,
    hash: machine().sha256Hex(bytes),
    blobSha: 'seeded',
    version,
    baseBytes: merged ? bytes : null,
  })
}

const remoteWrite = (rel: string, text: string, mtimeMs = REMOTE_MS): Promise<number> =>
  hubWrite(hub, ring, rel, text, mtimeMs)

const stores = (): StoreBody[] =>
  hub.sent
    .filter((req) => req.url.endsWith('/store'))
    .map((req) => JSON.parse(String(req.body)) as StoreBody)

const puts = (): TransportRequest[] => hub.sent.filter((req) => req.method === 'PUT')

const head = (path: string): Change | undefined =>
  [...hub.changes].reverse().find((change) => change.path === path)

beforeEach(async () => {
  root = tempRoot('pom-push-')
  await mkdir(join(root, '.nexus'), { recursive: true })
  installStores(memoryStores().stores)
  const made = await hubSession(root)
  session = made.session
  hub = made.hub
  ring = made.ring
  pushes = made.pushes
  hub.atMs = REMOTE_MS
  hub.sent.length = 0
})

afterEach(async () => {
  installStores(NO_STORES)
  await rm(root, { recursive: true, force: true })
})

describe('pushDirty', () => {
  it('never puts an unchanged file', async () => {
    await write('Notes/One.md', '---\nID: 01A\n---\n\nbody')
    await pushDirty(session, ['Notes/One.md'])
    expect(puts()).toHaveLength(1)

    await pushDirty(session, ['Notes/One.md'])
    expect(puts()).toHaveLength(1)
    expect(stores()).toHaveLength(1)
  })

  it('rounds a fractional mtime down so the hub takes the record', async () => {
    await write('Notes/One.md', page('one'))
    await utimes(abs('Notes/One.md'), 1789402202.7095, 1789402202.7095)
    expect((await machine().stat(abs('Notes/One.md')))?.mtimeMs).not.toBe(
      Math.floor((await machine().stat(abs('Notes/One.md')))?.mtimeMs ?? 0),
    )

    await pushDirty(session, ['Notes/One.md'])

    const change = stores()[0].changes[0]
    if (change.kind !== 'write') throw new Error('expected a write')
    expect(Number.isInteger(change.record.mtimeMs)).toBe(true)
    expect(readBase('Notes/One.md')?.version).toBe(hub.seq)
    expect(session.failed.size).toBe(0)
  })

  it('reads no bytes for a file whose stat matches its base', async () => {
    await write('Notes/One.md', page('one'))
    await pushDirty(session, ['Notes/One.md'])
    const read = vi.spyOn(machine(), 'readBytes')

    await pushDirty(session, ['Notes/One.md'])

    expect(read).not.toHaveBeenCalled()
    expect(stores()).toHaveLength(1)
    read.mockRestore()
  })

  it('skips a non-NFC path and stores the rest of the batch', async () => {
    const nfd = 'Notes/Cafe\u0301.md'
    await write(nfd, page('accented'))
    await write('Notes/Plain.md', page('plain'))

    await pushDirty(session, [nfd, 'Notes/Plain.md'])

    const stored = stores().flatMap((body) => body.changes.map(pathOf))
    expect(stored).toEqual(['Notes/Plain.md'])
    expect(pushes.at(-1)).toMatchObject(['sync:changed', { state: 'error' }])
    expect(session.failed.size).toBe(0)
  })

  it('never requeues a batch the hub called malformed', async () => {
    await write('Notes/One.md', page('one'))
    hub.intercept = (req) =>
      req.url.endsWith('/store') ? { status: 400, body: '{"error":"malformed"}' } : null

    await pushDirty(session, ['Notes/One.md'])

    expect(session.failed.size).toBe(0)
    expect(pushes.at(-1)).toMatchObject(['sync:changed', { state: 'error' }])
  })

  it('never stores a page without an ID', async () => {
    await write('Notes/Bare.md', 'no frontmatter here')
    await pushDirty(session, ['Notes/Bare.md'])
    expect(stores()).toHaveLength(0)
    expect(readBase('Notes/Bare.md')).toBeNull()
  })

  it('tombstones every row under a removed folder', async () => {
    const one = await remoteWrite('Notes/Daily/One.md', 'one')
    const two = await remoteWrite('Notes/Daily/Two.md', 'two')
    seedBase('Notes/Daily/One.md', utf8('one'), one)
    seedBase('Notes/Daily/Two.md', utf8('two'), two)

    await pushDirty(session, ['Notes/Daily'])

    expect(stores()[0].changes.map((change) => change.kind)).toEqual(['delete', 'delete'])
    expect(hub.items.get('Notes/Daily/One.md')?.deleted).toBe(true)
    expect(hub.items.get('Notes/Daily/Two.md')?.deleted).toBe(true)
    expect(readAllBases()).toEqual([])
  })

  it('re-stores a stale write whose local file is newer and captures the remote', async () => {
    const first = await remoteWrite('Notes/One.md', page('remote body'))
    seedBase('Notes/One.md', utf8(page('base body')), first - 1)
    await write('Notes/One.md', page('local body'), LOCAL_MS)

    await pushDirty(session, ['Notes/One.md'])

    expect(head('Notes/One.md')?.kind).toBe('write')
    expect(hub.items.get('Notes/One.md')?.version).toBe(hub.seq)
    expect(await read('Notes/One.md')).toBe(page('local body'))
    expect(readBase('Notes/One.md')?.version).toBe(hub.seq)
  })

  it('captures a stale write whose local file is older, ships the capture, and lands the remote', async () => {
    const first = await remoteWrite('Notes/One.md', page('remote body'))
    seedBase('Notes/One.md', utf8(page('base body')), first - 1)
    await write('Notes/One.md', page('local body'), OLD_MS)

    await pushDirty(session, ['Notes/One.md'])

    expect(hub.captures.map((record) => record.path)).toEqual(['Notes/One.md'])
    expect(await read('Notes/One.md')).toBe(page('remote body'))
    expect(readBase('Notes/One.md')?.version).toBe(first)
  })

  it('records the base when the stale head already holds the same bytes', async () => {
    const first = await remoteWrite('Notes/One.md', page('shared body'))
    seedBase('Notes/One.md', utf8(page('base body')), first - 1)
    await write('Notes/One.md', page('shared body'), LOCAL_MS)

    await pushDirty(session, ['Notes/One.md'])

    expect(hub.seq).toBe(first)
    expect(readBase('Notes/One.md')?.version).toBe(first)
    expect(hub.captures).toEqual([])
  })

  it('lands a merged JSON over a stale head and leaves it dirty', async () => {
    const rel = '.nexus/settings.json'
    const first = await remoteWrite(rel, '{"remote":1}')
    seedBase(rel, utf8('{}'), first - 1, true)
    await write(rel, '{"local":2}', LOCAL_MS)

    await pushDirty(session, [rel])

    const landed = JSON.parse(await read(rel)) as Record<string, number>
    expect(landed).toEqual({ remote: 1, local: 2 })
    expect(await isDirty(root, rel)).toBe(true)
  })

  it('follows a rename head to the new path', async () => {
    const first = await remoteWrite('Notes/One.md', page('remote body'))
    const moved = hubRename(hub, 'Notes/One.md', 'Notes/Two.md')
    seedBase('Notes/One.md', utf8(page('base body')), first)
    await write('Notes/One.md', page('local body'), LOCAL_MS)

    await pushDirty(session, ['Notes/One.md'])

    expect(moved).toBeLessThan(hub.seq)
    expect(await machine().stat(abs('Notes/One.md'))).toBeNull()
    expect(await read('Notes/Two.md')).toBe(page('local body'))
    expect(head('Notes/Two.md')?.kind).toBe('write')
    expect(readBase('Notes/Two.md')?.version).toBe(hub.seq)
  })

  it('re-stores a stale delete whose local file is newer', async () => {
    const first = await remoteWrite('Notes/One.md', page('remote body'))
    const gone = hubDelete(hub, 'Notes/One.md')
    seedBase('Notes/One.md', utf8(page('base body')), first)
    await write('Notes/One.md', page('local body'), LOCAL_MS)

    await pushDirty(session, ['Notes/One.md'])

    expect(gone).toBeLessThan(hub.seq)
    expect(head('Notes/One.md')?.kind).toBe('write')
    expect(await machine().stat(abs('Notes/One.md'))).not.toBeNull()
  })

  it('sends 450 dirty paths in three batches, deletes first', async () => {
    const rels: string[] = []
    for (let n = 0; n < 450; n += 1) {
      const rel = `Notes/Gone/${n}.md`
      seedBase(rel, utf8(String(n)), await remoteWrite(rel, String(n)))
      rels.push(rel)
    }
    await write('Notes/Kept.md', '---\nID: 01A\n---\n\nbody')
    rels.push('Notes/Kept.md')

    await pushDirty(session, rels)

    const batches = stores()
    expect(batches).toHaveLength(3)
    expect(batches.map((body) => body.changes.length)).toEqual([200, 200, 51])
    const kinds = batches.flatMap((body) => body.changes.map((change) => change.kind))
    expect(new Set(kinds.slice(0, 450))).toEqual(new Set(['delete']))
    expect(kinds[450]).toBe('write')
  })

  it('replays a dropped store once under the same request id', async () => {
    await write('Notes/One.md', '---\nID: 01A\n---\n\nbody')
    let seen = 0
    hub.intercept = (req) => (req.url.endsWith('/store') && seen++ === 0 ? 'throw' : null)

    await pushDirty(session, ['Notes/One.md'])

    const bodies = stores()
    expect(bodies).toHaveLength(2)
    expect(bodies[0].requestId).toBe(bodies[1].requestId)
    expect(readBase('Notes/One.md')?.version).toBe(hub.seq)
    expect(session.failed.size).toBe(0)
  })

  it('holds a batch the hub never answered in failed', async () => {
    await write('Notes/One.md', '---\nID: 01A\n---\n\nbody')
    hub.intercept = (req) => (req.url.endsWith('/store') ? 'throw' : null)

    await pushDirty(session, ['Notes/One.md'])

    expect([...session.failed]).toEqual(['Notes/One.md'])
    expect(pushes.at(-1)).toMatchObject(['sync:changed', { state: 'error' }])
    expect(readBase('Notes/One.md')).toBeNull()
  })
})

describe('pushRename', () => {
  it('ships one rename per base row and moves the rows', async () => {
    const one = await remoteWrite('Notes/Daily/One.md', 'one')
    const two = await remoteWrite('Notes/Daily/Two.md', 'two')
    seedBase('Notes/Daily/One.md', utf8('one'), one)
    seedBase('Notes/Daily/Two.md', utf8('two'), two)
    await write('Notes/Journal/One.md', 'one')
    await write('Notes/Journal/Two.md', 'two')

    await pushRename(session, 'Notes/Daily', 'Notes/Journal')

    expect(stores()[0].changes.map((change) => change.kind)).toEqual(['rename', 'rename'])
    expect(
      readAllBases()
        .map((row) => row.path)
        .sort(),
    ).toEqual(['Notes/Journal/One.md', 'Notes/Journal/Two.md'])
    expect(hub.items.has('Notes/Journal/One.md')).toBe(true)
    expect(hub.items.has('Notes/Daily/One.md')).toBe(false)
  })

  it('pushes bytes edited inside the rename debounce', async () => {
    const one = await remoteWrite('Notes/One.md', page('one'))
    seedBase('Notes/One.md', utf8(page('one')), one)
    await write('Notes/Two.md', page('edited during the rename'))

    await pushRename(session, 'Notes/One.md', 'Notes/Two.md')

    const kinds = stores().flatMap((body) => body.changes.map((change) => change.kind))
    expect(kinds).toEqual(['rename', 'write'])
    expect(readBase('Notes/Two.md')?.version).toBe(hub.seq)
  })

  it('tombstones the old path after a rename the hub never answered', async () => {
    const one = await remoteWrite('Notes/One.md', page('one'))
    seedBase('Notes/One.md', utf8(page('one')), one)
    hub.intercept = (req) => (req.url.endsWith('/store') ? 'throw' : null)

    await pushRename(session, 'Notes/One.md', 'Notes/Two.md')

    expect([...session.failed].sort()).toEqual(['Notes/One.md', 'Notes/Two.md'])
  })

  it('pushes a page renamed before its first push as a write', async () => {
    await write('Notes/Two.md', '---\nID: 01A\n---\n\nbody')

    await pushRename(session, 'Notes/One.md', 'Notes/Two.md')

    expect(stores()[0].changes.map((change) => change.kind)).toEqual(['write'])
    expect(readBase('Notes/Two.md')?.version).toBe(hub.seq)
  })
})
