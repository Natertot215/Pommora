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
import { tempRoot, readJsonAt } from '../Testing/hostFs'
import { memoryStores } from '../Testing/memoryStores'
import { type HubHost, hubHost } from '../Testing/syncHub'
import { nexusHandlers, openNexusSequence } from './handlers'
import { dropLiveTree, heldTreeOf, refreshTree } from './liveTree'
import { closeSession, sessionRoot, waitingOpen } from './session'
import * as readNexusModule from './readNexus'
import { readNexus } from './readNexus'
import { projectBaseline, readBaseline } from './remintLedger'
import { stabilize } from './treeStabilize'
import { splitFrontmatter } from '../Files/pageFile'
import { ID_KEY, isUlidShaped } from './identityMark'

const NEXUS = '01KVGMT8BFP350FZZXAMG1QDRN'
const NOTES = '01KVGMT8BFP350FZZXAMG1QDRW'
const OTHER = '01KVGMT8BFP350FZZXAMG1QDRX'
const THIRD_PAGE = '01KVGMT8BFP350FZZXAMG1QDRY'
const SHELF = '01KVGMT8BFP350FZZXAMG1QDRZ'
const HOME = '01KVGMT8BFP350FZZXAMG1QDS0'
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
    await openNexusSequence(ctx, root, false)
    await writeFile(settings, '{ corrupt')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await openNexusSequence(ctx, root, false)
    expect((await refreshTree(root)).config.excluded).toEqual(['Private'])
  })

  it('waits on a Nexus whose identity file is damaged, and opens it once the file parses', async () => {
    const identity = join(root, '.nexus', 'nexus.json')
    const good = await readFile(identity, 'utf8')
    await writeFile(identity, '{"id": "')
    const openStores = vi.fn()
    ctx.openStores = openStores
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await openNexusSequence(ctx, root, false)
    const why = 'Couldn’t read “nexus.json”.'
    expect(sessionRoot()).toBeNull()
    expect(waitingOpen()).toEqual({ root, path: root, why })
    expect(openStores).toHaveBeenLastCalledWith(root, null)
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

  it('a waiting open stamps, walks, and syncs nothing', async () => {
    const loose = join(root, 'Library', 'Loose.md')
    await writeFile(loose, 'no id yet')
    await writeFile(join(root, '.nexus', 'properties.json'), '{ corrupt')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await openNexusSequence(ctx, root, true)
    await turn(100)
    expect(waitingOpen()?.why).toBe('Couldn’t read “properties.json”.')
    expect(await readFile(loose, 'utf8')).toBe('no id yet')
    expect(heldTreeOf(root)).toBeNull()
    expect(currentSession()).toBeNull()
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
    expect((await readJsonAt<{ defs: { a: { type: string } } }>(registry)).defs.a.type).toBe(
      'multiSelect',
    )
  })

  it('registers the Multi-Select member a page already holds, with the repair sweep off', async () => {
    const registry = join(root, '.nexus', 'properties.json')
    await writeFile(
      registry,
      JSON.stringify({
        defs: {
          tags: {
            id: 'tags',
            name: 'Tags',
            type: 'multiSelect',
            select_options: [{ value: 'alpha' }],
          },
        },
      }),
    )
    await writeFile(
      join(root, 'Library', '_pagecollection.json'),
      JSON.stringify({ id: 'col-lib', properties: ['tags'] }),
    )
    await writeFile(
      join(root, 'Library', 'Notes.md'),
      `---\nID: ${NOTES}\nTags:\n  - Ideas\n---\nbody`,
    )
    await openNexusSequence(ctx, root, false)
    await vi.waitFor(async () =>
      expect(
        (
          await readJsonAt<{ defs: { tags: { select_options: { value: string }[] } } }>(registry)
        ).defs.tags.select_options.map((o) => o.value),
      ).toEqual(['alpha', 'Ideas']),
    )
  })

  it('stamps a folder of ID-less notes and holds each under the ID in its file', async () => {
    await mkdir(join(root, 'Inbox', 'Later'), { recursive: true })
    await writeFile(join(root, 'Inbox', 'One.md'), 'one')
    await writeFile(join(root, 'Inbox', 'Two.md'), '---\nicon: star\n---\ntwo')
    await writeFile(join(root, 'Inbox', 'Later', 'Three.md'), 'three')
    await openNexusSequence(ctx, root, true)
    const idIn = async (...segs: string[]): Promise<unknown> =>
      splitFrontmatter(await readFile(join(root, 'Inbox', ...segs), 'utf8'))[ID_KEY]
    const inbox = heldTreeOf(root)?.collections.find((c) => c.path === 'Inbox')
    expect(inbox?.pages.map((p) => p.id).sort()).toEqual(
      [await idIn('One.md'), await idIn('Two.md')].sort(),
    )
    expect(inbox?.sets[0]?.pages.map((p) => p.id)).toEqual([await idIn('Later', 'Three.md')])
    for (const p of [...(inbox?.pages ?? []), ...(inbox?.sets[0]?.pages ?? [])])
      expect(isUlidShaped(p.id)).toBe(true)
    expect(heldTreeOf(root)?.unreadable).toBeUndefined()
  })

  it('an open that stamps nothing reads once, and one that stamps reads again and holds every page it stamped', async () => {
    const reads = vi.spyOn(readNexusModule, 'readNexus')
    await openNexusSequence(ctx, root, true)
    expect(reads).toHaveBeenCalledTimes(1)
    closeSession()
    dropLiveTree()
    await writeFile(join(root, 'Library', 'Bare.md'), 'bare')
    await mkdir(join(root, 'Inbox'))
    await writeFile(join(root, 'Inbox', 'One.md'), 'one')
    reads.mockClear()
    await openNexusSequence(ctx, root, true)
    expect(reads).toHaveBeenCalledTimes(2)
    reads.mockRestore()
    const held = heldTreeOf(root)
    expect(held?.unreadable).toBeUndefined()
    expect(held?.collections.flatMap((c) => c.pages.map((p) => p.title)).sort()).toEqual([
      'Bare',
      'Notes',
      'One',
    ])
    expect(held && stabilize(await readNexus(root), held)).toBe(held)
  })

  it('an open stamps a Space missing its ID before it holds the tree, so a page tagged with it holds its link', async () => {
    const home = join(root, '.nexus', 'contexts', 'Areas', 'Home')
    await mkdir(home, { recursive: true })
    await writeFile(join(home, '_space.json'), '{}')
    await writeFile(
      join(root, 'Library', 'Tagged.md'),
      `---\nID: ${THIRD_PAGE}\n<Areas>:\n  - Home\n---\nbody`,
    )
    await openNexusSequence(ctx, root, true)
    const held = heldTreeOf(root)
    if (!held) throw new Error('no tree held')
    const areas = held.contexts.find((g) => g.def.title === 'Areas')
    const space = areas?.spaces.find((s) => s.title === 'Home')
    if (!areas || !space) throw new Error('no Home Space held')
    const tagged = held.collections[0]?.pages.find((p) => p.id === THIRD_PAGE)
    expect(tagged?.contextValues).toEqual({ [areas.def.id]: [space.id] })
    expect(stabilize(await readNexus(root), held)).toBe(held)
  })

  it('a reopen that re-mints a duplicated page, Set, and Space holds no shared ID and agrees with a fresh read', async () => {
    const reopen = async (): Promise<void> => {
      closeSession()
      dropLiveTree()
      await openNexusSequence(ctx, root, true)
    }
    const space = join(root, '.nexus', 'contexts', 'Areas', 'Home')
    await mkdir(join(root, 'Library', 'Shelf'))
    await writeFile(join(root, 'Library', 'Shelf', '_pageset.json'), JSON.stringify({ id: SHELF }))
    await openNexusSequence(ctx, root, true)
    await mkdir(space, { recursive: true })
    await writeFile(join(space, '_space.json'), JSON.stringify({ id: HOME }))
    await reopen()
    await writeFile(join(root, 'Library', 'Copy.md'), `---\nID: ${NOTES}\n---\nbody`)
    await mkdir(join(root, 'Library', 'Shelf Copy'))
    await writeFile(
      join(root, 'Library', 'Shelf Copy', '_pageset.json'),
      JSON.stringify({ id: SHELF }),
    )
    await mkdir(`${space} Copy`)
    await writeFile(join(`${space} Copy`, '_space.json'), JSON.stringify({ id: HOME }))
    await reopen()
    const held = heldTreeOf(root)
    if (!held) throw new Error('no tree held')
    const { entries, duplicates } = projectBaseline(held)
    expect(duplicates).toEqual({})
    expect(Object.keys(entries)).toEqual(expect.arrayContaining([NOTES, SHELF, HOME]))
    expect(Object.keys(entries)).toHaveLength(10)
    expect(held.unreadable).toBeUndefined()
    expect(stabilize(await readNexus(root), held)).toBe(held)
  })

  it('a reopen that re-mints a duplicated Context holds the Spaces its folder holds and the pages tagged with them', async () => {
    await openNexusSequence(ctx, root, true)
    const registry = await readJsonAt<{ contexts: { id: string; title: string }[] }>(
      contextsRegistryFile(root),
    )
    const areas = registry.contexts.find((c) => c.title === 'Areas')
    if (!areas) throw new Error('no Areas Context seeded')
    registry.contexts.push({ ...areas, title: 'Realms' })
    await writeFile(contextsRegistryFile(root), JSON.stringify(registry))
    const home = join(contextsDir(root), 'Realms', 'Home')
    await mkdir(home, { recursive: true })
    await writeFile(join(home, '_space.json'), JSON.stringify({ id: HOME }))
    await writeFile(
      join(root, 'Library', 'Tagged.md'),
      `---\nID: ${THIRD_PAGE}\n<Realms>:\n  - Home\n---\nbody`,
    )
    closeSession()
    dropLiveTree()
    await openNexusSequence(ctx, root, true)
    const held = heldTreeOf(root)
    if (!held) throw new Error('no tree held')
    const realms = held.contexts.find((g) => g.def.title === 'Realms')
    expect(realms?.def.id).not.toBe(areas.id)
    expect(realms?.spaces.map((s) => s.id)).toEqual([HOME])
    const tagged = held.collections[0]?.pages.find((p) => p.id === THIRD_PAGE)
    expect(tagged?.contextValues).toEqual({ [realms?.def.id ?? '']: [HOME] })
    expect(stabilize(await readNexus(root), held)).toBe(held)
  })

  it('a failed walk retains the prior baseline and the open proceeds', async () => {
    await openNexusSequence(ctx, root, true)
    const first = readBaseline()
    expect(first).not.toBeNull()
    closeSession()
    dropLiveTree()
    const walk = vi
      .spyOn(readNexusModule, 'readNexus')
      .mockRejectedValueOnce(new Error('walk failed'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await openNexusSequence(ctx, root, true)
    expect(walk).toHaveBeenCalled()
    expect(readBaseline()).toEqual(first)
    expect(sessionRoot()).toBe(root)
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
