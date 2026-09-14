import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import type { TileHostRef } from '../../Tiles/tiles'
import { tempRoot } from '../../Testing/hostFs'
import { makeTree } from '../../Testing/testTree'
import { memoryStores } from '../../Testing/memoryStores'
import { dropLiveTree, seedLiveTree } from '../../Nexus/liveTree'
import {
  type CaptureStore,
  installStores,
  NO_STORES,
  type SyncStore,
  syncStore,
} from '../../Platform/stores'
import { isRecentWrite } from '../../Files/writeEcho'
import { machine } from '../../Platform/machine'
import { join } from '../../Paths/posix'
import type { Change, ItemRecord } from '../Contract/wire'
import type { SyncHost } from '../Client/call'
import { landDelete, landRename, landWrite, newerSide } from './land'

const LOCAL_DEVICE = 'aaaa'
const REMOTE_DEVICE = 'bbbb'
const MTIME = Date.UTC(2026, 8, 1, 12)

let root: string
let pushes: TileHostRef[]
let host: SyncHost
let mem: ReturnType<typeof memoryStores>

const abs = (rel: string): string => join(root, rel)
const utf8 = (text: string): Uint8Array => new TextEncoder().encode(text)
const bases = (): SyncStore => syncStore() as SyncStore

const record = (path: string, bytes: Uint8Array, mtimeMs = MTIME): ItemRecord => ({
  path,
  mtimeMs,
  size: bytes.length,
  keyId: 'k1',
  sha256: machine().sha256Hex(bytes),
})

const write = (path: string, bytes: Uint8Array, seq = 1, mtimeMs = MTIME): Change => ({
  seq,
  kind: 'write',
  path,
  record: record(path, bytes, mtimeMs),
  device: REMOTE_DEVICE,
  atMs: mtimeMs,
})

const tombstone = (path: string, seq = 2): Change => ({
  seq,
  kind: 'delete',
  path,
  device: REMOTE_DEVICE,
  atMs: MTIME,
})

const rename = (from: string, path: string, seq = 3): Change => ({
  seq,
  kind: 'rename',
  path,
  from,
  device: REMOTE_DEVICE,
  atMs: MTIME,
})

beforeEach(async () => {
  root = tempRoot('pom-land-')
  await mkdir(join(root, '.nexus'), { recursive: true })
  pushes = []
  host = {
    device: { id: LOCAL_DEVICE } as SyncHost['device'],
    transport: (() => {
      throw new Error('no transport')
    }) as unknown as SyncHost['transport'],
    secrets: {} as SyncHost['secrets'],
    push: ((_k: string, payload: TileHostRef) => {
      pushes.push(payload)
    }) as unknown as SyncHost['push'],
  }
  mem = memoryStores()
  installStores(mem.stores)
})

afterEach(async () => {
  installStores(NO_STORES)
  dropLiveTree()
  await rm(root, { recursive: true, force: true })
})

describe('newerSide', () => {
  it('names the newer side and breaks a tie on the smaller device id', () => {
    expect(newerSide(MTIME + 5_000, 'zzz', MTIME, 'aaa')).toBe('local')
    expect(newerSide(MTIME, 'zzz', MTIME + 5_000, 'aaa')).toBe('remote')
    expect(newerSide(MTIME + 500, 'aaa', MTIME, 'zzz')).toBe('local')
    expect(newerSide(MTIME + 500, 'zzz', MTIME, 'aaa')).toBe('remote')
  })
})

describe('landWrite', () => {
  it('lands bytes with the writer mtime and a base row at the change seq', async () => {
    const bytes = utf8('arrived\n')
    await landWrite(host, root, write('Notes/A.md', bytes, 7), bytes)
    expect(await readFile(abs('Notes/A.md'), 'utf8')).toBe('arrived\n')
    expect(Math.round((await stat(abs('Notes/A.md'))).mtimeMs)).toBe(MTIME)
    const row = bases().readBase('Notes/A.md')
    expect(row?.version).toBe(7)
    expect(row?.hash).toBe(machine().sha256Hex(bytes))
    expect(row?.baseBytes).toBeNull()
  })

  it('merges a JSON landing over a local change and records the remote as base', async () => {
    const path = '.nexus/settings.json'
    const base = utf8(JSON.stringify({ personalization: { accent: 'lavender', density: 'cozy' } }))
    const local = utf8(JSON.stringify({ personalization: { accent: 'moss', density: 'cozy' } }))
    const remote = utf8(
      JSON.stringify({ personalization: { accent: 'lavender', density: 'tight' } }),
    )
    await writeFile(abs(path), local)
    bases().upsertBase({
      path,
      mtimeMs: MTIME - 10_000,
      size: base.length,
      hash: machine().sha256Hex(base),
      blobSha: machine().sha256Hex(base),
      version: 1,
      baseBytes: base,
    })
    await landWrite(host, root, write(path, remote, 4), remote)
    const disk = await readFile(abs(path), 'utf8')
    expect(JSON.parse(disk)).toEqual({ personalization: { accent: 'moss', density: 'tight' } })
    const row = bases().readBase(path)
    expect(row?.hash).toBe(machine().sha256Hex(remote))
    expect(machine().sha256Hex(await readFile(abs(path)))).not.toBe(row?.hash)
    expect(row?.baseBytes).toEqual(remote)
    expect((await stat(abs(path))).mtimeMs).not.toBe(row?.mtimeMs)
    expect(row?.mtimeMs).toBe(MTIME)
  })

  it('merges a JSON landing against an absent base and keeps the local-only keys', async () => {
    const path = '.nexus/settings.json'
    const local = utf8(JSON.stringify({ personalization: { accent: 'moss' }, pinned: ['A.md'] }))
    const remote = utf8(JSON.stringify({ personalization: { accent: 'lavender' } }))
    await writeFile(abs(path), local)

    await landWrite(host, root, write(path, remote, 4, Date.now() + 600_000), remote)

    expect(JSON.parse(await readFile(abs(path), 'utf8'))).toEqual({
      personalization: { accent: 'lavender' },
      pinned: ['A.md'],
    })
  })

  it('pushes tiles:changed for a landed tile body', async () => {
    seedLiveTree(makeTree())
    const bytes = utf8('tile\n')
    await landWrite(host, root, write('.nexus/homepage/t1.md', bytes), bytes)
    await landWrite(host, root, write('.nexus/contexts/Realms/Work/t2.md', bytes, 2), bytes)
    expect(pushes).toEqual([{ kind: 'homepage' }, { kind: 'space', id: 'a1' }])
  })

  it('records no echo', async () => {
    const bytes = utf8('quiet\n')
    await landWrite(host, root, write('Notes/A.md', bytes), bytes)
    await landRename(root, rename('Notes/A.md', 'Notes/B.md'))
    expect(isRecentWrite(abs('Notes/A.md'))).toBe(false)
    expect(isRecentWrite(abs('Notes/B.md'))).toBe(false)
  })
})

describe('landDelete', () => {
  it('removes the file and its base row on a tombstone', async () => {
    const bytes = utf8('gone\n')
    await landWrite(host, root, write('Notes/A.md', bytes), bytes)
    await landWrite(host, root, write('Notes/B.md', bytes, 2), bytes)
    await landDelete(root, tombstone('Notes/A.md'))
    expect(await machine().stat(abs('Notes/A.md'))).toBeNull()
    expect(bases().readBase('Notes/A.md')).toBeNull()
    expect(await machine().stat(abs('Notes'))).not.toBeNull()
  })

  it('captures local bytes the base row never recorded before removing them', async () => {
    const added = vi.spyOn(mem.stores.captures as CaptureStore, 'addCapture')
    const bytes = utf8('synced\n')
    await landWrite(host, root, write('Notes/A.md', bytes), bytes)
    await writeFile(abs('Notes/A.md'), utf8('unpushed\n'))

    await landDelete(root, tombstone('Notes/A.md'), 'tombstone-lost')

    expect(await machine().stat(abs('Notes/A.md'))).toBeNull()
    const [path, , reason, losing] = added.mock.calls[0]
    expect([path, reason]).toEqual(['Notes/A.md', 'tombstone-lost'])
    expect(new TextDecoder().decode(losing)).toBe('unpushed\n')
  })

  it('removes an emptied parent directory after a tombstone and keeps the root', async () => {
    const bytes = utf8('only\n')
    await landWrite(host, root, write('Notes/Ideas/Solo.md', bytes), bytes)
    await landDelete(root, tombstone('Notes/Ideas/Solo.md'))
    expect(await machine().stat(abs('Notes/Ideas'))).toBeNull()
    await landWrite(host, root, write('Top.md', bytes, 4), bytes)
    await landDelete(root, tombstone('Top.md', 5))
    expect(await machine().stat(root)).not.toBeNull()
  })
})

describe('landRename', () => {
  it('moves the file and the base row on a rename', async () => {
    const bytes = utf8('moved\n')
    await landWrite(host, root, write('Notes/A.md', bytes), bytes)
    await landRename(root, rename('Notes/A.md', 'Notes/B.md', 9))
    expect(await readFile(abs('Notes/B.md'), 'utf8')).toBe('moved\n')
    expect(await machine().stat(abs('Notes/A.md'))).toBeNull()
    expect(bases().readBase('Notes/A.md')).toBeNull()
    expect(bases().readBase('Notes/B.md')?.version).toBe(9)
  })

  it('captures a local file the rename is about to overwrite', async () => {
    const added = vi.spyOn(mem.stores.captures as CaptureStore, 'addCapture')
    const bytes = utf8('moved\n')
    await landWrite(host, root, write('Notes/A.md', bytes), bytes)
    await writeFile(abs('Notes/B.md'), utf8('mine\n'))

    await landRename(root, rename('Notes/A.md', 'Notes/B.md', 9))

    expect(await readFile(abs('Notes/B.md'), 'utf8')).toBe('moved\n')
    const [path, , reason, losing] = added.mock.calls[0]
    expect([path, reason]).toEqual(['Notes/B.md', 'local-lost'])
    expect(new TextDecoder().decode(losing)).toBe('mine\n')
  })

  it('moves a folder onto an existing directory without reading it', async () => {
    const bytes = utf8('child\n')
    await landWrite(host, root, write('Notes/Ideas/One.md', bytes), bytes)
    await mkdir(abs('Notes/Plans'), { recursive: true })

    await landRename(root, rename('Notes/Ideas', 'Notes/Plans', 11))

    expect(await readFile(abs('Notes/Plans/One.md'), 'utf8')).toBe('child\n')
    expect(await machine().stat(abs('Notes/Ideas'))).toBeNull()
  })

  it('moves every base row under a renamed folder', async () => {
    const bytes = utf8('child\n')
    await landWrite(host, root, write('Notes/Ideas/One.md', bytes), bytes)
    await landWrite(host, root, write('Notes/Ideas/Two.md', bytes, 2), bytes)
    await landRename(root, rename('Notes/Ideas', 'Notes/Plans', 11))
    expect(
      bases()
        .readAllBases()
        .map((r) => r.path),
    ).toEqual(['Notes/Plans/One.md', 'Notes/Plans/Two.md'])
    expect(await readFile(abs('Notes/Plans/Two.md'), 'utf8')).toBe('child\n')
  })
})
