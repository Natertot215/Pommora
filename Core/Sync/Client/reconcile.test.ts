import { mkdir, rm, utimes, writeFile } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { join } from '../../Paths/posix'
import { machine } from '../../Platform/machine'
import { installStores, NO_STORES } from '../../Platform/stores'
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

  it('writes nothing and seeds every base when both sides match', async () => {
    await hubWrite(hub, ring, 'Notes/One.md', page('one'))
    await write('Notes/One.md', page('one'))

    await reconcile(session)

    expect(stores()).toEqual([])
    expect(hub.seq).toBe(1)
    expect(readBase('Notes/One.md')?.version).toBe(1)
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

  it('lands a tombstone over a local file the hub deleted', async () => {
    await hubWrite(hub, ring, 'Notes/One.md', page('one'))
    hubDelete(hub, 'Notes/One.md')
    await write('Notes/One.md', page('one'), REMOTE_MS - 60_000)

    await reconcile(session)

    expect(await here('Notes/One.md')).toBe(false)
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

  it('walks nothing when the settings change leaves the scope alone', async () => {
    await rescope(session, { excluded: [], assetDir: '.nexus/assets' })
    expect(hub.sent).toEqual([])
  })
})
