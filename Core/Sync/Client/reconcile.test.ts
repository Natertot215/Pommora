import { mkdir, rename, rm, utimes, writeFile } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { join } from '../../Paths/posix'
import { installMachine, machine } from '../../Platform/machine'
import { type CaptureStore, captureStore, installStores, NO_STORES } from '../../Platform/stores'
import { tempRoot } from '../../Testing/hostFs'
import { memoryStores } from '../../Testing/memoryStores'
import { type FakeHub, hubDelete, hubRename, hubSession, hubWrite } from '../../Testing/syncHub'
import type { StoreBody } from '../Contract/wire'
import type { Ring } from '../Keys/ring'
import { readAllBases, readBase } from './base'
import { reconcile, rescope } from './reconcile'
import type { Session } from './session'

const REMOTE_MS = Date.UTC(2026, 8, 1, 12)
const LOCAL_MS = REMOTE_MS + 60_000

const utf8 = (text: string): Uint8Array => new TextEncoder().encode(text)
const page = (body: string): string => `---\nID: 01KVGMT8BFP350FZZXAMG1QDRA\n---\n\n${body}`

let root: string
let hub: FakeHub
let ring: Ring
let session: Session

const abs = (rel: string): string => join(root, rel)

const read = async (rel: string): Promise<string> =>
  new TextDecoder().decode((await machine().readBytes(abs(rel))) ?? new Uint8Array())

const here = async (rel: string): Promise<boolean> => (await machine().stat(abs(rel))) !== null

const write = async (rel: string, text: string, mtimeMs = LOCAL_MS): Promise<void> => {
  await mkdir(join(root, rel).split('/').slice(0, -1).join('/'), { recursive: true })
  await writeFile(abs(rel), utf8(text))
  await utimes(abs(rel), new Date(mtimeMs), new Date(mtimeMs))
}

const stores = (): StoreBody[] =>
  hub.sent
    .filter((req) => req.url.endsWith('/store'))
    .map((req) => JSON.parse(String(req.body)) as StoreBody)

const paths = (): string[] =>
  readAllBases()
    .map((row) => row.path)
    .sort()

beforeEach(async () => {
  root = tempRoot('pom-reconcile-')
  await mkdir(join(root, '.nexus'), { recursive: true })
  installStores(memoryStores().stores)
  const made = await hubSession(root)
  session = made.session
  hub = made.hub
  ring = made.ring
  hub.atMs = REMOTE_MS
  hub.sent.length = 0
})

afterEach(async () => {
  installStores(NO_STORES)
  await rm(root, { recursive: true, force: true })
})

describe('reconcile', () => {
  it('pushes everything to an empty hub', async () => {
    await write('Notes/One.md', page('one'))
    await write('Notes/Two.md', page('two'))

    await reconcile(session)

    expect(stores().flatMap((body) => body.changes.map((change) => change.kind))).toEqual([
      'write',
      'write',
    ])
    expect(paths()).toEqual(['Notes/One.md', 'Notes/Two.md'])
    expect(session.target.cursor).toBe(0)
  })

  it('lands everything into an empty copy', async () => {
    await hubWrite(hub, ring, 'Notes/One.md', page('one'))
    await hubWrite(hub, ring, 'Notes/Two.md', page('two'))

    await reconcile(session)

    expect(await read('Notes/One.md')).toBe(page('one'))
    expect(await read('Notes/Two.md')).toBe(page('two'))
    expect(stores()).toEqual([])
    expect(session.target.cursor).toBe(2)
  })

  it('passes over a name a Windows host cannot hold', async () => {
    await hubWrite(hub, ring, 'Notes/Why?.md', page('why'))
    await hubWrite(hub, ring, 'Notes/Two.md', page('two'))
    const disk = machine()
    installMachine({ ...disk, platform: 'windows' })
    try {
      await reconcile(session)
    } finally {
      installMachine(disk)
    }

    expect(await here('Notes/Why?.md')).toBe(false)
    expect(await read('Notes/Two.md')).toBe(page('two'))
    expect(session.target.cursor).toBe(2)
  })

  it('sets the cursor to the log top even below a cursor the hub refused', async () => {
    await hubWrite(hub, ring, 'Notes/One.md', page('one'))
    session.target = { ...session.target, cursor: 9 }

    await reconcile(session)

    expect(session.target.cursor).toBe(1)
  })

  it('reads only the heads of a long history in one pull', async () => {
    for (let n = 0; n < 250; n++) await hubWrite(hub, ring, 'Notes/One.md', page(`draft ${n}`))
    await write('Notes/One.md', page('draft 249'))

    await reconcile(session)

    const pulls = hub.sent.filter((req) => req.url.endsWith('/pull'))
    expect(pulls.map((req) => JSON.parse(String(req.body)).heads)).toEqual([true])
    expect(readBase('Notes/One.md')?.version).toBe(250)
    expect(session.target.cursor).toBe(250)
  })

  it('writes nothing and seeds every base when both sides match', async () => {
    await hubWrite(hub, ring, 'Notes/One.md', page('one'))
    await write('Notes/One.md', page('one'))

    await reconcile(session)

    expect(stores()).toEqual([])
    expect(hub.seq).toBe(1)
    expect(readBase('Notes/One.md')?.version).toBe(1)
  })

  it('takes the case the hub spells a file in when it holds that file under another', async () => {
    await hubWrite(hub, ring, 'Notes/One.md', page('one'))
    await write('notes/one.md', page('one'))

    await reconcile(session)

    expect((await machine().readDir(root)).map((e) => e.name).sort()).toEqual(['.nexus', 'Notes'])
    expect((await machine().readDir(abs('Notes'))).map((e) => e.name)).toEqual(['One.md'])
    expect(paths()).toEqual(['Notes/One.md'])
    expect(stores()).toEqual([])
  })

  it('stores a newer local copy under the case the hub spells rather than as a second item', async () => {
    await hubWrite(hub, ring, 'Notes/One.md', page('one'))
    await write('Notes/one.md', page('edited'))

    await reconcile(session)

    expect(stores().flatMap((body) => body.changes)).toMatchObject([
      { kind: 'write', record: { path: 'Notes/One.md' } },
    ])
    expect(paths()).toEqual(['Notes/One.md'])
  })

  it('stores a local file beside a recased one under the folder case the hub spells', async () => {
    await hubWrite(hub, ring, 'notes/One.md', page('one'))
    await write('Notes/One.md', page('one'))
    await write('Notes/Two.md', page('two'))

    await reconcile(session)

    expect(stores().flatMap((body) => body.changes)).toMatchObject([
      { kind: 'write', record: { path: 'notes/Two.md' } },
    ])
    expect(paths()).toEqual(['notes/One.md', 'notes/Two.md'])
  })

  it('takes the case of a rename the hub holds for a file this disk never recorded', async () => {
    await hubWrite(hub, ring, 'Notes/Draft.md', page('one'))
    hubRename(hub, 'Notes/Draft.md', 'Notes/One.md')
    await write('Notes/one.md', page('one'))

    await reconcile(session)

    expect((await machine().readDir(abs('Notes'))).map((e) => e.name)).toEqual(['One.md'])
    expect(stores()).toEqual([])
  })

  it('keeps a local file whose spelling the hub renamed away and then deleted', async () => {
    await hubWrite(hub, ring, 'Notes/Draft.md', page('one'))
    hubRename(hub, 'Notes/Draft.md', 'Notes/One.md')
    hubDelete(hub, 'Notes/One.md')
    await write('notes/one.md', page('mine'))

    await reconcile(session)

    expect(await read('notes/one.md')).toBe(page('mine'))
    expect(paths()).toEqual(['notes/one.md'])
  })

  it('takes the live case past a tombstone at the local spelling', async () => {
    await hubWrite(hub, ring, 'notes/one.md', page('one'))
    hubDelete(hub, 'notes/one.md')
    await hubWrite(hub, ring, 'Notes/One.md', page('one'))
    await write('notes/one.md', page('one'))

    await reconcile(session)

    expect(paths()).toEqual(['Notes/One.md'])
    expect(stores()).toEqual([])
  })

  it('leaves a folder alone when a file sync tracks holds its local case', async () => {
    await hubWrite(hub, ring, 'Notes/One.md', page('one'))
    await hubWrite(hub, ring, 'notes/Two.md', page('two'))
    await write('Notes/One.md', page('one'))
    await write('Notes/Two.md', page('two'))

    await reconcile(session)

    expect((await machine().readDir(root)).map((e) => e.name).sort()).toEqual(['.nexus', 'Notes'])
    expect(readBase('Notes/One.md')?.path).toBe('Notes/One.md')
  })

  it('ships a case rename this disk made offline rather than undoing it', async () => {
    await hubWrite(hub, ring, 'Notes/one.md', page('one'))
    await write('Notes/one.md', page('one'))
    await reconcile(session)
    await rename(abs('Notes/one.md'), abs('Notes/One.md'))
    hub.sent.length = 0

    await reconcile(session)

    expect((await machine().readDir(abs('Notes'))).map((e) => e.name)).toEqual(['One.md'])
    expect(stores().flatMap((body) => body.changes)).toMatchObject([
      { kind: 'rename', from: 'Notes/one.md', path: 'Notes/One.md' },
    ])
  })

  it('follows a case rename in the log to its version', async () => {
    await hubWrite(hub, ring, 'Notes/one.md', page('one'))
    await write('Notes/one.md', page('one'))
    await reconcile(session)
    const seq = hubRename(hub, 'Notes/one.md', 'Notes/One.md')

    await reconcile(session)

    expect((await machine().readDir(abs('Notes'))).map((e) => e.name)).toEqual(['One.md'])
    expect(readBase('Notes/One.md')).toMatchObject({ path: 'Notes/One.md', version: seq })
  })

  it('follows a rename in the log to the new path', async () => {
    await hubWrite(hub, ring, 'Notes/One.md', page('one'))
    hubRename(hub, 'Notes/One.md', 'Notes/Two.md')
    await write('Notes/One.md', page('one'))

    await reconcile(session)

    expect(await here('Notes/One.md')).toBe(false)
    expect(await read('Notes/Two.md')).toBe(page('one'))
    expect(paths()).toEqual(['Notes/Two.md'])
    expect(stores()).toEqual([])
  })

  it('a rename in the log to a name a Windows host cannot hold takes the local copy off it', async () => {
    await hubWrite(hub, ring, 'Notes/Plan.md', page('plan'))
    hubRename(hub, 'Notes/Plan.md', 'Notes/Q3: Plan.md')
    await write('Notes/Plan.md', page('plan'))
    const disk = machine()
    installMachine({ ...disk, platform: 'windows' })
    try {
      await reconcile(session)
    } finally {
      installMachine(disk)
    }

    expect(await here('Notes/Plan.md')).toBe(false)
    expect(await here('Notes/Q3: Plan.md')).toBe(false)
    expect(paths()).toEqual([])
  })

  it('follows a rename chain to its last path', async () => {
    await hubWrite(hub, ring, 'Notes/One.md', page('one'))
    hubRename(hub, 'Notes/One.md', 'Notes/Two.md')
    hubRename(hub, 'Notes/Two.md', 'Notes/Three.md')
    await write('Notes/One.md', page('one'))

    await reconcile(session)

    expect(await here('Notes/One.md')).toBe(false)
    expect(await here('Notes/Two.md')).toBe(false)
    expect(await read('Notes/Three.md')).toBe(page('one'))
    expect(paths()).toEqual(['Notes/Three.md'])
    expect(stores()).toEqual([])
  })

  it('lands a tombstone over a local file the hub deleted and captures it', async () => {
    const added = vi.spyOn(captureStore() as CaptureStore, 'addCapture')
    await hubWrite(hub, ring, 'Notes/One.md', page('one'))
    hubDelete(hub, 'Notes/One.md')
    await write('Notes/One.md', page('one'), REMOTE_MS - 60_000)

    await reconcile(session)

    expect(await here('Notes/One.md')).toBe(false)
    expect(paths()).toEqual([])
    expect(added.mock.calls.map(([path, , reason]) => [path, reason])).toEqual([
      ['Notes/One.md', 'tombstone-lost'],
    ])
  })

  it('pushes a delete for a base row whose file is gone', async () => {
    await hubWrite(hub, ring, 'Notes/One.md', page('one'))
    await write('Notes/One.md', page('one'))
    await reconcile(session)
    expect(paths()).toEqual(['Notes/One.md'])
    hub.sent.length = 0
    await rm(abs('Notes/One.md'))

    await reconcile(session)

    expect(stores().flatMap((body) => body.changes.map((change) => change.kind))).toEqual([
      'delete',
    ])
    expect(paths()).toEqual([])
  })

  it('drops base rows on an exclusion change and stores no delete', async () => {
    await hubWrite(hub, ring, 'Private/Secret.md', page('secret'))
    await write('Private/Secret.md', page('secret'))
    await reconcile(session)
    expect(paths()).toEqual(['Private/Secret.md'])
    hub.sent.length = 0

    await rescope(session, { excluded: ['Private'], assetDir: '.nexus/assets' })

    expect(paths()).toEqual([])
    expect(stores()).toEqual([])
    expect(await here('Private/Secret.md')).toBe(true)
  })

  it('reads only the files no base row vouches for on an exclusion change', async () => {
    await rescope(session, { excluded: ['Private'], assetDir: '.nexus/assets' })
    await write('Notes/One.md', page('one'))
    await write('Private/New.md', page('new'))
    await reconcile(session)
    const read = vi.spyOn(machine(), 'readBytes')

    await rescope(session, { excluded: [], assetDir: '.nexus/assets' })

    const reads = read.mock.calls.map(([path]) => path)
    read.mockRestore()
    expect(reads).toContain(abs('Private/New.md'))
    expect(reads).not.toContain(abs('Notes/One.md'))
    expect(paths()).toEqual(['Notes/One.md', 'Private/New.md'])
  })

  it('walks nothing when the settings change leaves the scope alone', async () => {
    await rescope(session, { excluded: [], assetDir: '.nexus/assets' })
    expect(hub.sent).toEqual([])
  })
})
