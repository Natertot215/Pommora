import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HostContext } from '../Contract/handlers'
import { writeJournal } from '../Contexts/contextJournal'
import { contextsDir, contextsRegistryFile } from '../Paths/paths'
import { join } from '../Paths/posix'
import { readValue, writeValue } from '../Platform/localState'
import { installStores, NO_STORES } from '../Platform/stores'
import { currentSession, startSession, stopSession } from '../Sync/Client/session'
import { currentStatus } from '../Sync/Client/status'
import { tempRoot } from '../Testing/hostFs'
import { memoryStores } from '../Testing/memoryStores'
import { type HubHost, hubHost } from '../Testing/syncHub'
import { nexusHandlers, openNexusSequence } from './handlers'
import { dropLiveTree, refreshTree } from './liveTree'
import { closeSession, sessionRoot, waitingOpen } from './session'

const NEXUS = '01KVGMT8BFP350FZZXAMG1QDRN'
const NOTES = '01KVGMT8BFP350FZZXAMG1QDRW'
const OTHER = '01KVGMT8BFP350FZZXAMG1QDRX'
const THIRD_PAGE = '01KVGMT8BFP350FZZXAMG1QDRY'
const ADDRESS = 'http://127.0.0.1:7473'

let root: string
let ctx: HostContext
let made: HubHost
let stores: ReturnType<typeof memoryStores>

const turn = (ms = 20): Promise<void> => new Promise((wake) => setTimeout(wake, ms))

const isStore = (req: { url: string }): boolean => new URL(req.url).pathname === '/store'

async function settledSession(): Promise<void> {
  for (let tries = 0; tries < 50 && currentSession() === null; tries += 1) await turn()
}

async function secondNexus(
  prefix: string,
): Promise<{ second: string; later: ReturnType<typeof memoryStores> }> {
  const second = tempRoot(prefix)
  const tag = second.slice(second.lastIndexOf('/') + 1)
  const later = memoryStores()
  await mkdir(join(second, '.nexus'), { recursive: true })
  await writeFile(
    join(second, '.nexus', 'nexus.json'),
    JSON.stringify({ id: OTHER, createdAt: '2026-09-01T12:00:00.000Z' }),
  )
  ctx.openStores = (at: string) => installStores(at.includes(tag) ? later.stores : stores.stores)
  return { second, later }
}

beforeEach(async () => {
  root = tempRoot('pom-open-session-')
  await mkdir(join(root, '.nexus'), { recursive: true })
  await writeFile(
    join(root, '.nexus', 'nexus.json'),
    JSON.stringify({ id: NEXUS, createdAt: '2026-09-01T12:00:00.000Z' }),
  )
  await mkdir(join(root, 'Library'))
  await writeFile(join(root, 'Library', '_pagecollection.json'), JSON.stringify({ id: 'col-lib' }))
  await writeFile(join(root, 'Library', 'Notes.md'), `---\nID: ${NOTES}\n---\nbody`)
  stores = memoryStores()
  installStores(stores.stores)
  made = await hubHost({ nexusId: NEXUS })
  ctx = { ...made.ctx, openStores: () => {} } as HostContext
  writeValue('sync', { address: ADDRESS, pin: null, cursor: 0 })
})

afterEach(async () => {
  await stopSession({ push: () => {} })
  closeSession()
  dropLiveTree()
  installStores(NO_STORES)
  vi.restoreAllMocks()
  await turn(50)
  await rm(root, { recursive: true, force: true })
})

describe('openNexusSequence', () => {
  it('restarts the sync session when the open Nexus is re-pointed to itself', async () => {
    await openNexusSequence(ctx, root, false)
    await settledSession()
    expect(currentSession()).not.toBeNull()

    await openNexusSequence(ctx, root, false)
    await settledSession()

    expect(currentSession()).not.toBeNull()
    expect(currentStatus().state).not.toBe('off')
  })

  it('a reopen of the open Nexus keeps the settings it read', async () => {
    const settings = join(root, '.nexus', 'settings.json')
    await writeFile(settings, JSON.stringify({ excluded_folders: ['Private'] }))
    const opened = await openNexusSequence(ctx, root, false)
    await writeFile(settings, '{ corrupt')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await openNexusSequence(ctx, root, false)
    expect((await refreshTree(opened)).excluded).toEqual(['Private'])
  })

  it('waits on a Nexus whose identity file is damaged, and opens it once the file parses', async () => {
    const identity = join(root, '.nexus', 'nexus.json')
    const good = await readFile(identity, 'utf8')
    await writeFile(identity, '{"id": "')
    const openStores = vi.fn()
    ctx.openStores = openStores
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(openNexusSequence(ctx, root, false)).resolves.toBe(root)
    const why = 'Couldn’t read “nexus.json”.'
    expect(sessionRoot()).toBeNull()
    expect(waitingOpen()).toEqual({ root, path: root, why })
    expect(openStores).toHaveBeenLastCalledWith(root, null)
    expect(await readFile(identity, 'utf8')).toBe('{"id": "')
    expect(await nexusHandlers['nexus:state']()).toMatchObject({
      ok: false,
      error: { message: why },
    })

    await writeFile(identity, good)
    await openNexusSequence(ctx, root, true)
    expect(sessionRoot()).toBe(root)
    expect(waitingOpen()).toBeNull()
    expect(await nexusHandlers['nexus:state']()).toMatchObject({
      ok: true,
      value: { status: 'open' },
    })
  })

  it('a reopen of the open Nexus keeps its id while its identity file is damaged', async () => {
    const openStores = vi.fn()
    ctx.openStores = openStores
    await openNexusSequence(ctx, root, false)
    await writeFile(join(root, '.nexus', 'nexus.json'), '{"id": "')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await openNexusSequence(ctx, root, false)
    expect(openStores).toHaveBeenLastCalledWith(root, NEXUS)
  })

  it('respells a legacy property type in the registry it opens', async () => {
    const registry = join(root, '.nexus', 'properties.json')
    await writeFile(
      registry,
      JSON.stringify({ defs: { a: { id: 'a', name: 'Tags', type: 'multi_select' } } }),
    )
    await openNexusSequence(ctx, root, false)
    expect(JSON.parse(await readFile(registry, 'utf8')).defs.a.type).toBe('multiSelect')
  })

  it('drains an in-flight push before the stores swap', async () => {
    const { second, later } = await secondNexus('pom-open-swap-')

    let release!: () => void
    const held = new Promise<void>((wake) => {
      release = wake
    })
    made.hub.intercept = (req) =>
      new URL(req.url).pathname === '/store'
        ? held.then(() => ({
            status: 200,
            body: JSON.stringify({
              outcomes: [{ path: 'Library/Notes.md', ok: true, version: 1 }],
              seq: 1,
            }),
          }))
        : null

    try {
      await openNexusSequence(ctx, root, false)
      await settledSession()
      for (let tries = 0; tries < 100 && !made.hub.sent.some(isStore); tries += 1) await turn()
      expect(made.hub.sent.some(isStore)).toBe(true)

      const opening = openNexusSequence(ctx, second, false)
      await turn()
      release()
      await opening
      await turn()

      expect(stores.stores.sync?.readBase('Library/Notes.md')).not.toBeNull()
      expect(later.stores.sync?.readBase('Library/Notes.md')).toBeNull()
    } finally {
      await rm(second, { recursive: true, force: true })
    }
  })

  it('stops an old-Nexus sync start that shared its wait before the new stores bind', async () => {
    const { second } = await secondNexus('pom-open-restart-')

    let release!: () => void
    const held = new Promise<void>((wake) => {
      release = wake
    })
    made.hub.intercept = (req) =>
      isStore(req) ? held.then(() => ({ status: 200, body: '{"outcomes":[],"seq":0}' })) : null

    try {
      await openNexusSequence(ctx, root, false)
      await settledSession()
      for (let tries = 0; tries < 100 && !made.hub.sent.some(isStore); tries += 1) await turn()
      expect(made.hub.sent.some(isStore)).toBe(true)

      const restarting = startSession(ctx, root, NEXUS)
      const opening = openNexusSequence(ctx, second, false)
      await turn()
      release()
      await Promise.all([restarting, opening])
      await turn(100)

      expect(readValue('sync')).toBeNull()
      expect(currentSession()).toBeNull()
    } finally {
      await rm(second, { recursive: true, force: true })
    }
  })

  it('replays a pending context rename against the Nexus being opened', async () => {
    const { second } = await secondNexus('pom-open-replay-')
    await mkdir(contextsDir(second), { recursive: true })
    await writeFile(
      contextsRegistryFile(second),
      JSON.stringify({
        contexts: [{ id: 'ctx_projects', title: 'Projects', singular: 'Project' }],
      }),
    )
    await mkdir(join(second, 'Notes'))
    await writeFile(
      join(second, 'Notes', 'A.md'),
      `---\nID: ${THIRD_PAGE}\n<Projects>:\n  - Pommora\n---\nbody`,
    )
    await writeJournal(second, {
      contextId: 'ctx_projects',
      oldTitle: 'Projects',
      newTitle: 'Ventures',
      skipped: [],
    })

    try {
      await openNexusSequence(ctx, root, false)
      await openNexusSequence(ctx, second, false)

      expect(await readFile(join(second, 'Notes', 'A.md'), 'utf8')).toContain('<Ventures>:')
    } finally {
      await rm(second, { recursive: true, force: true })
    }
  })
})
