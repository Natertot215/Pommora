import { mkdir, rename, rm, truncate, utimes, writeFile } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TransportRequest } from '../../Contract/handlers'
import { join } from '../../Paths/posix'
import { machine } from '../../Platform/machine'
import { type CaptureStore, captureStore, installStores, NO_STORES } from '../../Platform/stores'
import { tempRoot } from '../../Testing/hostFs'
import { memoryStores } from '../../Testing/memoryStores'
import { type FakeHub, hubDelete, hubRename, hubSession, hubWrite } from '../../Testing/syncHub'
import { testKeys } from '../../Testing/syncDevice'
import vectors from '../Contract/vectors.json'
import type { Change, StoreBody } from '../Contract/wire'
import { SEAL_OVERHEAD } from '../Keys/item'
import type { Ring } from '../Keys/ring'
import { isDirty, readAllBases, readBase, upsertBase } from './base'
import { ITEM_CAP, pushDirty, pushRename } from './push'
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

  it('reads no bytes for a file whose stat matches its base on the start sweep', async () => {
    await write('Notes/One.md', page('one'))
    await pushDirty(session, ['Notes/One.md'])
    const read = vi.spyOn(machine(), 'readBytes')

    await pushDirty(session, ['Notes/One.md'], true)

    expect(read).not.toHaveBeenCalled()
    expect(stores()).toHaveLength(1)
    read.mockRestore()
  })

  it('hashes a file rewritten under its own stat when it is not the start sweep', async () => {
    await write('Notes/One.md', page('one'))
    await pushDirty(session, ['Notes/One.md'])
    expect(stores()).toHaveLength(1)

    await write('Notes/One.md', page('two'))
    await pushDirty(session, ['Notes/One.md'])

    expect(stores()).toHaveLength(2)
    expect(await read('Notes/One.md')).toBe(page('two'))
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

  it('never ships a Pommora JSON file that does not parse, and ships it once it does', async () => {
    await write('.nexus/state.json', '{ corrupt')
    await pushDirty(session, ['.nexus/state.json'])
    expect(puts()).toHaveLength(0)
    expect(readBase('.nexus/state.json')).toBeNull()
    await write('.nexus/state.json', '{"order":{}}')
    await pushDirty(session, ['.nexus/state.json'])
    expect(puts()).toHaveLength(1)
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
    const added = vi.spyOn(captureStore() as CaptureStore, 'addCapture')
    const first = await remoteWrite('Notes/One.md', page('remote body'))
    seedBase('Notes/One.md', utf8(page('base body')), first - 1)
    await write('Notes/One.md', page('local body'), LOCAL_MS)

    await pushDirty(session, ['Notes/One.md'])

    expect(
      added.mock.calls.map(([path, , reason, bytes]) => [path, reason, decode(bytes)]),
    ).toEqual([['Notes/One.md', 'remote-lost', page('remote body')]])
    expect(head('Notes/One.md')?.kind).toBe('write')
    expect(hub.items.get('Notes/One.md')?.version).toBe(hub.seq)
    expect(await read('Notes/One.md')).toBe(page('local body'))
    expect(readBase('Notes/One.md')?.version).toBe(hub.seq)
  })

  it('captures a stale write whose local file is older, ships the capture, and lands the remote', async () => {
    const added = vi.spyOn(captureStore() as CaptureStore, 'addCapture')
    const first = await remoteWrite('Notes/One.md', page('remote body'))
    seedBase('Notes/One.md', utf8(page('base body')), first - 1)
    await write('Notes/One.md', page('local body'), OLD_MS)

    await pushDirty(session, ['Notes/One.md'])

    expect(
      added.mock.calls.map(([path, , reason, bytes]) => [path, reason, decode(bytes)]),
    ).toEqual([['Notes/One.md', 'local-lost', page('local body')]])
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

  it('keeps a readable JSON file over a damaged stale head, then ships it over that head', async () => {
    const rel = '.nexus/state.json'
    const first = await remoteWrite(rel, '{ corrupt')
    seedBase(rel, utf8('{}'), first - 1, true)
    await write(rel, '{"order":{"collections":["a"]}}', LOCAL_MS)

    await pushDirty(session, [rel])
    expect(JSON.parse(await read(rel))).toEqual({ order: { collections: ['a'] } })
    expect(readBase(rel)?.version).toBe(first)

    await pushDirty(session, [rel])
    const shipped = stores()
      .at(-1)
      ?.changes.find((change) => pathOf(change) === rel)
    expect(shipped).toMatchObject({ kind: 'write', base: first })
    expect(await isDirty(root, rel)).toBe(false)
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

  it('refuses a file over the cap before it reads a byte of it', async () => {
    await write('Notes/Big.bin', 'x')
    await truncate(abs('Notes/Big.bin'), ITEM_CAP + 1)
    const read = vi.spyOn(machine(), 'readBytes')

    await pushDirty(session, ['Notes/Big.bin'])

    expect(read).not.toHaveBeenCalled()
    expect(stores()).toEqual([])
    expect(pushes.at(-1)).toMatchObject(['sync:changed', { state: 'error' }])
    read.mockRestore()
  })

  it('caps a sealed file at the size the hub shares', () => {
    expect(ITEM_CAP).toBe(vectors.blobCap)
  })

  it('keeps home a file whose sealed bytes would pass the hub cap', async () => {
    await write('Notes/Edge.bin', 'x')
    await truncate(abs('Notes/Edge.bin'), ITEM_CAP - SEAL_OVERHEAD + 1)
    const read = vi.spyOn(machine(), 'readBytes')

    await pushDirty(session, ['Notes/Edge.bin'])

    expect(read).not.toHaveBeenCalled()
    expect(pushes.at(-1)).toMatchObject(['sync:changed', { state: 'error' }])
    read.mockRestore()
  })

  it('keeps home a blob the hub refuses as too large and never retries it', async () => {
    await write('Notes/One.md', page('one'))
    hub.intercept = (req) =>
      req.method === 'PUT' ? { status: 413, body: '{"error":"too-large"}' } : null

    await pushDirty(session, ['Notes/One.md'])

    expect(session.failed.size).toBe(0)
    expect(stores()).toEqual([])
    expect(pushes.at(-1)).toMatchObject(['sync:changed', { state: 'error' }])
  })

  it('halves a batch the hub refuses as too large until each half fits', async () => {
    await write('Notes/One.md', page('one'))
    await write('Notes/Two.md', page('two'))
    await write('Notes/Three.md', page('three'))
    hub.intercept = (req) =>
      req.url.endsWith('/store') && (JSON.parse(String(req.body)) as StoreBody).changes.length > 1
        ? { status: 413, body: '{"error":"too-large"}' }
        : null

    await pushDirty(session, ['Notes/One.md', 'Notes/Two.md', 'Notes/Three.md'])

    expect(stores().map((body) => body.changes.length)).toEqual([3, 2, 1, 1, 1])
    expect(readAllBases()).toHaveLength(3)
    expect(session.failed.size).toBe(0)
  })

  it('reloads the ring when a stale head names a key this device lacks', async () => {
    const info = hub.info
    if (info === null) throw new Error('the hub holds no key record')
    const other = await testKeys()
    hub.info = { ...info, ring: [...info.ring, ...other.entries] }
    const first = await hubWrite(hub, other.ring, 'Notes/One.md', page('remote body'))
    seedBase('Notes/One.md', utf8(page('base body')), first - 1)
    await write('Notes/One.md', page('local body'), OLD_MS)

    await pushDirty(session, ['Notes/One.md'])

    expect(await read('Notes/One.md')).toBe(page('remote body'))
    expect(hub.captures.map((record) => record.path)).toEqual(['Notes/One.md'])
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
    expect(hub.items.get('Notes/Daily/One.md')?.deleted).toBe(true)
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

describe('a case-only rename', () => {
  const held = async (rel: string, body: string): Promise<void> => {
    const bytes = await write(rel, body)
    seedBase(rel, bytes, await remoteWrite(rel, body))
  }

  const liveItems = (): string[] =>
    [...hub.items].filter(([, item]) => !item.deleted).map(([path]) => path)

  it.each([
    ['both cases', ['Notes/title.md', 'Notes/Title.md']],
    ['the new case alone', ['Notes/Title.md']],
  ])('made outside the app ships one rename when the tap reports %s', async (_, reported) => {
    await held('Notes/title.md', page('one'))
    await rename(abs('Notes/title.md'), abs('Notes/Title.md'))

    await pushDirty(session, reported)

    expect(stores().flatMap((body) => body.changes.map((change) => change.kind))).toEqual([
      'rename',
    ])
    expect(liveItems()).toEqual(['Notes/Title.md'])
    expect(readAllBases().map((row) => row.path)).toEqual(['Notes/Title.md'])
  })

  it('ships nothing for an echo of the case it left', async () => {
    await held('Notes/Title.md', page('one'))

    await pushDirty(session, ['Notes/title.md'])

    expect(stores()).toEqual([])
  })

  it('holds a case rename the hub never answered in failed, once', async () => {
    await held('Notes/title.md', page('one'))
    await rename(abs('Notes/title.md'), abs('Notes/Title.md'))
    hub.intercept = (req) => (req.url.endsWith('/store') ? 'throw' : null)

    await pushDirty(session, ['Notes/Title.md'])

    expect(stores()).toHaveLength(2)
    expect([...session.failed].sort()).toEqual(['Notes/Title.md', 'Notes/title.md'])
    expect(readAllBases().map((row) => row.path)).toEqual(['Notes/title.md'])
  })

  it('keeps home a decomposed name its composed base row would otherwise rename', async () => {
    const composed = 'Notes/Caf\u00e9.md'
    seedBase(composed, utf8(page('one')), await remoteWrite(composed, page('one')))
    await write(composed.normalize('NFD'), page('one'))

    await pushDirty(session, [composed.normalize('NFD')])

    expect(stores()).toEqual([])
    expect(pushes.at(-1)).toMatchObject(['sync:changed', { state: 'error' }])
  })

  it('keeps home a sibling that differs only in case on a case-sensitive disk', async (ctx) => {
    await held('Notes/a.md', page('lower'))
    await write('Notes/A.md', page('upper'))
    if ((await read('Notes/a.md')) === page('upper')) ctx.skip()

    await pushDirty(session, ['Notes/A.md', 'Notes/a.md'])

    expect(stores()).toEqual([])
    expect(pushes.at(-1)).toMatchObject(['sync:changed', { state: 'error' }])
  })

  it('ships a folder renamed by case on a case-sensitive disk as a rename', async (ctx) => {
    await held('Notes/One.md', page('one'))
    await rename(abs('Notes'), abs('notes'))
    if ((await machine().stat(abs('Notes/One.md'))) !== null) ctx.skip()

    await pushDirty(session, ['Notes/One.md', 'notes/One.md'])

    expect(liveItems()).toEqual(['notes/One.md'])
    expect(readAllBases().map((row) => row.path)).toEqual(['notes/One.md'])
  })

  it('leaves a folder whose case differs from the hub under the hub case', async (ctx) => {
    await held('Notes/One.md', page('one'))
    await rename(abs('Notes'), abs('notes'))
    if ((await machine().stat(abs('Notes/One.md'))) === null) ctx.skip()
    await write('notes/One.md', page('edited'))

    await pushDirty(session, ['notes/One.md'])

    expect(stores().flatMap((body) => body.changes.map((change) => change.kind))).toEqual(['write'])
    expect(liveItems()).toEqual(['Notes/One.md'])
  })
})
