import { mkdir, readFile, rename, rm, utimes, writeFile } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HostContext } from '../Contract/handlers'
import * as finishModule from './finishOwed'
import { contextsDir, contextsRegistryFile } from '../Paths/paths'
import { OWED_REL, spaceDirRel } from '../Paths/nexusPaths'
import { basename, dirname, join } from '../Paths/posix'
import { readValue, writeValue } from '../Platform/localState'
import { installStores, NO_STORES } from '../Platform/stores'
import { installMachine, machine } from '../Platform/machine'
import { diskMachine } from '../Testing/machines'
import { currentSession, startSession, stopSession } from '../Sync/Client/session'
import { currentStatus } from '../Sync/Client/status'
import { putJson, readJsonAt, seedNexus, tempRoot } from '../Testing/hostFs'
import { memoryStores } from '../Testing/memoryStores'
import { deindexPath, seedContentIndex } from '../Index/indexSeed'
import * as indexSeedModule from '../Index/indexSeed'
import * as refileModule from '../Archive/refile'
import { jsonText, pathExists } from '../Files/atomicWrite'
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
import { registerHeldOptions } from '../Properties/optionOps'

const NEXUS = '01KVGMT8BFP350FZZXAMG1QDRN'
const NOTES = '01KVGMT8BFP350FZZXAMG1QDRW'
const OTHER = '01KVGMT8BFP350FZZXAMG1QDRX'
const THIRD_PAGE = '01KVGMT8BFP350FZZXAMG1QDRY'
const SHELF = '01KVGMT8BFP350FZZXAMG1QDRZ'
const HOME = '01KVGMT8BFP350FZZXAMG1QDS0'
const POMMORA = '01KVGMT8BFP350FZZXAMG1QDS1'
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
    await writeFile(join(root, '.nexus', 'settings.json'), '{ corrupt')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await openNexusSequence(ctx, root, true)
    await turn(100)
    expect(waitingOpen()?.why).toBe('Couldn’t read “settings.json”.')
    expect(await readFile(loose, 'utf8')).toBe('no id yet')
    expect(heldTreeOf(root)).toBeNull()
    expect(currentSession()).toBeNull()
  })

  it('opens a Nexus whose property list is damaged, with no definitions, the list named unreadable, its Collections keeping their ids, and its Spaces listed', async () => {
    await writeFile(
      join(root, 'Library', '_pagecollection.json'),
      JSON.stringify({ id: 'col-lib', properties: ['tags'] }),
    )
    await mkdir(join(contextsDir(root), 'Areas', 'Home'), { recursive: true })
    await writeFile(
      contextsRegistryFile(root),
      JSON.stringify({ contexts: [{ id: 'ctx-areas', title: 'Areas' }] }),
    )
    await writeFile(
      join(contextsDir(root), 'Areas', 'Home', '_space.json'),
      JSON.stringify({ id: HOME }),
    )
    // Damaged bytes are the case under test.
    await writeFile(join(root, '.nexus', 'properties.json'), '{ corrupt')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await openNexusSequence(ctx, root, false)
    expect(sessionRoot()).toBe(root)
    expect(waitingOpen()).toBeNull()
    const tree = heldTreeOf(root)
    expect(tree?.config.registry).toEqual([])
    expect(tree?.unreadable).toContainEqual({
      path: '.nexus/properties.json',
      kind: 'registry',
      reason: 'unparsed',
    })
    expect(tree?.collections.find((c) => c.id === 'col-lib')?.propertyIds).toEqual(['tags'])
    expect(tree?.contexts.flatMap((g) => g.spaces.map((s) => s.id))).toEqual([HOME])
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

  it('the open and a settle register the Multi-Select members each page’s index row holds, and a page with no row from its file', async () => {
    const registry = join(root, '.nexus', 'properties.json')
    await seedNexus(root, {
      defs: [
        {
          id: 'tags',
          label: 'Tags',
          key: 'Tags',
          type: 'multiSelect',
          select_options: [{ id: 'opt_alpha', key: 'alpha', label: 'alpha' }],
        },
      ],
    })
    await writeFile(
      join(root, 'Library', '_pagecollection.json'),
      JSON.stringify({ id: 'col-lib', properties: ['tags'] }),
    )
    await writeFile(
      join(root, 'Library', 'Notes.md'),
      `---\nID: ${NOTES}\nTags:\n  - Ideas\n---\nbody`,
    )
    const options = async (): Promise<string[]> =>
      (
        await readJsonAt<{ defs: { tags: { select_options: { label: string }[] } } }>(registry)
      ).defs.tags.select_options.map((o) => o.label)
    await openNexusSequence(ctx, root, false)
    await vi.waitFor(async () => expect(await options()).toEqual(['alpha', 'Ideas']))
    // Changed on disk with no event, so the index still holds what the open's seed read.
    const notes = join(root, 'Library', 'Notes.md')
    await writeFile(notes, `---\nID: ${NOTES}\nTags:\n  - Ideas\n  - Later\n---\nbody`)
    const reads = vi.spyOn(readNexusModule, 'readPageRecord')
    // The open's repair-and-register chain may still be settling a write of its own; only this call's reads count.
    reads.mockClear()
    await registerHeldOptions(root)
    expect(reads).not.toHaveBeenCalled()
    expect(await options()).toEqual(['alpha', 'Ideas'])
    await registerHeldOptions(root, ['Library/Notes.md'])
    expect(await options()).toEqual(['alpha', 'Ideas'])
    deindexPath(root, notes)
    await registerHeldOptions(root, ['Library/Notes.md'])
    expect(await options()).toEqual(['alpha', 'Ideas', 'Later'])
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

  it('finishes a Context rename the open finds committed and unmoved, and the held tree follows the folder', async () => {
    const { second } = await secondNexus('pom-open-replay-')
    const pommora = join(contextsDir(second), 'Projects', 'Pommora')
    await mkdir(pommora, { recursive: true })
    await writeFile(join(pommora, '_space.json'), JSON.stringify({ id: POMMORA }))
    await writeFile(
      contextsRegistryFile(second),
      JSON.stringify({
        contexts: [{ id: 'ctx_projects', title: 'Ventures', singular: 'Project' }],
      }),
    )
    await mkdir(join(second, 'Notes'))
    await writeFile(
      join(second, 'Notes', 'A.md'),
      `---\nID: ${THIRD_PAGE}\n<Projects>:\n  - Pommora\n---\nbody`,
    )
    await putJson(join(second, OWED_REL), {
      ctx_projects: { kind: 'context', rename: ['Projects'] },
    })

    try {
      await openNexusSequence(ctx, root, false)
      await openNexusSequence(ctx, second, false)

      expect(await readFile(join(second, 'Notes', 'A.md'), 'utf8')).toContain('<Ventures>:')
      expect(heldTreeOf(second)?.contexts[0]?.spaces.map((s) => s.path)).toEqual([
        spaceDirRel('Ventures', 'Pommora'),
      ])
    } finally {
      await rm(second, { recursive: true, force: true })
    }
  })

  it('the open runs the one finishing pass', async () => {
    const finishing = vi.spyOn(finishModule, 'finishOwed')
    await openNexusSequence(ctx, root, false)
    expect(finishing).toHaveBeenCalledWith(root)
  })

  it('a re-adopt of the open Nexus finishes no Context rename', async () => {
    await openNexusSequence(ctx, root, false)
    await mkdir(contextsDir(root), { recursive: true })
    await writeFile(
      contextsRegistryFile(root),
      JSON.stringify({
        contexts: [{ id: 'ctx_projects', title: 'Ventures', singular: 'Project' }],
      }),
    )
    const tagged = join(root, 'Library', 'Tagged.md')
    await writeFile(tagged, `---\nID: ${THIRD_PAGE}\n<Projects>:\n  - Pommora\n---\nbody`)
    const owed = { ctx_projects: { kind: 'context', rename: ['Projects'] } }
    await putJson(join(root, OWED_REL), owed)
    await openNexusSequence(ctx, root, false)
    expect(await readFile(tagged, 'utf8')).toContain('<Projects>:')
    expect(await readJsonAt(join(root, OWED_REL))).toEqual(owed)
  })

  it('an open cascades a heading renamed while it was closed into the page that links it', async () => {
    const notes = join(root, 'Library', 'Notes.md')
    const linker = join(root, 'Library', 'Linker.md')
    await writeFile(notes, `---\nID: ${NOTES}\n---\n\n## Setup\n`)
    await writeFile(linker, `---\nID: ${THIRD_PAGE}\n---\n\n[[Notes#Setup]]\n`)
    await seedContentIndex(root)
    await writeFile(notes, `---\nID: ${NOTES}\n---\n\n## Intro\n`)
    await utimes(notes, new Date(Date.now() + 86_400_000), new Date(Date.now() + 86_400_000))
    await openNexusSequence(ctx, root, false)
    await vi.waitFor(async () =>
      expect(await readFile(linker, 'utf8')).toContain('[[Notes#Intro]]'),
    )
  })

  it('an open re-spells a path link to a page moved while it was closed, and leaves a bare one', async () => {
    const linker = join(root, 'Library', 'Linker.md')
    await mkdir(join(root, 'Archive'))
    await writeFile(
      join(root, 'Archive', '_pagecollection.json'),
      JSON.stringify({ id: 'col-arc' }),
    )
    await writeFile(linker, `---\nID: ${THIRD_PAGE}\n---\n\n[[Library/Notes]] and [[Notes]]\n`)
    await seedContentIndex(root)
    await rename(join(root, 'Library', 'Notes.md'), join(root, 'Archive', 'Notes.md'))
    await openNexusSequence(ctx, root, false)
    await vi.waitFor(async () =>
      expect(await readFile(linker, 'utf8')).toContain('[[Archive/Notes|Notes]] and [[Notes]]'),
    )
  })
  it('an open sweeps an Orphaned Archive into the Trash before the index seeds', async () => {
    const archive = join(root, '.nexus', 'archive', SHELF)
    const bundle = join(archive, 'Gone', '2026-10-20T00-00-00-000Z__Orphan.md.archived')
    await mkdir(bundle, { recursive: true })
    await writeFile(join(bundle, 'Orphan.md'), `---\nID: ${THIRD_PAGE}\n---\norphan\n`)
    await writeFile(
      join(bundle, '_record.json'),
      jsonText({ entity: 'page', parent: { kind: 'container', id: HOME } }),
    )
    const real = indexSeedModule.seedContentIndex
    let heldAtSeed: boolean | undefined
    vi.spyOn(indexSeedModule, 'seedContentIndex').mockImplementation(async (r) => {
      heldAtSeed ??= await pathExists(archive)
      return real(r)
    })
    await openNexusSequence(ctx, root, false)
    expect(heldAtSeed).toBe(false)
    expect(await pathExists(join(root, '.trash', 'Gone'))).toBe(true)
  })

  it('a failing open pass leaves the open whole', async () => {
    vi.spyOn(refileModule, 'settleArchives').mockRejectedValueOnce(new Error('unreadable'))
    const seeded = vi.spyOn(indexSeedModule, 'seedContentIndex')
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    await openNexusSequence(ctx, root, false)
    expect(seeded).toHaveBeenCalledWith(root)
    expect(logged).toHaveBeenCalledWith('archive: the open pass failed:', 'unreadable')
    expect(heldTreeOf(root)?.collections[0]?.pages[0]?.id).toBe(NOTES)
  })
})

describe('index:headings', () => {
  it('answers every page’s headings but an archived page’s', async () => {
    const bundle = '.nexus/archive/col-lib/Library/2026-10-20T12-00-00-000Z__Arc.md.archived'
    const archived = `${bundle}/Arc.md`
    await writeFile(join(root, 'Library', 'Notes.md'), `---\nID: ${NOTES}\n---\n\n## Setup\n`)
    await mkdir(join(root, bundle), { recursive: true })
    await writeFile(join(root, archived), `---\nID: ${THIRD_PAGE}\n---\n\n## Setup\n`)
    await openNexusSequence(ctx, root, false)

    const all = await nexusHandlers['index:headings'](ctx, undefined)
    expect(all.ok && Object.keys(all.value)).toEqual(['Library/Notes.md'])
    expect(await nexusHandlers['index:headings'](ctx, [archived])).toEqual({ ok: true, value: {} })
  })
})

describe('path:copy', () => {
  afterEach(() => installMachine(diskMachine()))

  it('writes the Default Path Format to the clipboard, with or without the extension', async () => {
    const write = vi.fn(async () => {})
    ctx.clipboard = { read: async () => '', write }
    await openNexusSequence(ctx, root, false)
    installMachine({ ...machine(), home: dirname(root) })

    await nexusHandlers['path:copy'](ctx, 'Library/Notes.md')
    expect(write).toHaveBeenLastCalledWith(`~/${basename(root)}/Library/Notes`)

    writeValue('devicePrefs', { defaultPathFormat: 'relative', includeExtensions: true })
    await nexusHandlers['path:copy'](ctx, 'Library/Notes.md')
    expect(write).toHaveBeenLastCalledWith('Library/Notes.md')
    expect(write).toHaveBeenCalledTimes(2)
  })
})
