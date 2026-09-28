// A delete's record must exist on disk BEFORE the step that destroys what it describes. Every assertion here is taken from inside the arm's real code — the collaborators are wrapped, never replaced — because ordering is invisible to an after-the-fact assertion.

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { splitFrontmatter } from '../Files/pageFile'
import { join } from '../Paths/posix'
import { tempRoot, readJsonAt } from '../Testing/hostFs'
import { lockContention } from '../Testing/machines'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pathExists, readJsonObject } from '../Files/atomicWrite'
import { handleMutate } from '../Nexus/mutate'
import { contextsDir, contextsRegistryFile } from '../Paths/paths'
import { listBundles } from './spend'
import { machine } from '../Platform/machine'

import { closeSession, openSession } from '../Nexus/session'
import type { TrashDeps } from './bundle'

const PAGE_A = '01KVGMT8BFP350FZZXAMG1QDVA'
const PAGE_B = '01KVGMT8BFP350FZZXAMG1QDVB'
const nexusDeps: TrashDeps = { trashMode: 'nexus', trashToSystem: async () => {} }

let root: string
let atSweep: unknown
let atSettle: unknown
let atReach: unknown
let deleting = ''
let settleFails = false

async function firstRecordUnder(dir: string): Promise<unknown> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  for (const e of entries) {
    if (!e.isDirectory()) continue
    const hit = join(dir, e.name, '_record.json')
    if (await pathExists(hit)) return await readJsonAt(hit)
    const deeper = await firstRecordUnder(join(dir, e.name))
    if (deeper !== undefined) return deeper
  }
  return undefined
}

const anyRecord = (): Promise<unknown> => firstRecordUnder(join(root, '.trash'))

vi.mock('../Contexts/contextCascade', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../Contexts/contextCascade')>()
  return {
    ...actual,
    unlinkSpaceValue: async (...args: Parameters<typeof actual.unlinkSpaceValue>) => {
      atSweep = await anyRecord()
      return actual.unlinkSpaceValue(...args)
    },
    unlinkContextKey: async (...args: Parameters<typeof actual.unlinkContextKey>) => {
      atSweep = await anyRecord()
      return actual.unlinkContextKey(...args)
    },
  }
})

vi.mock('../Nexus/cascade', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../Nexus/cascade')>()
  return {
    ...actual,
    deleteCascade: async (...args: Parameters<typeof actual.deleteCascade>) => {
      atSweep = await anyRecord()
      return actual.deleteCascade(...args)
    },
  }
})

vi.mock('./bundle', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./bundle')>()
  return {
    ...actual,
    settleBundle: async (bundleDir: string, absPath: string) => {
      atSettle = await readJsonObject(join(bundleDir, '_record.json'))
      if (settleFails) throw new Error('the process died before the artifact moved')
      return actual.settleBundle(bundleDir, absPath)
    },
  }
})

vi.mock('../Nexus/configReach', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../Nexus/configReach')>()
  return {
    ...actual,
    reachConfig: async (...args: Parameters<typeof actual.reachConfig>) => {
      atReach = await pathExists(deleting)
      return actual.reachConfig(...args)
    },
  }
})

beforeEach(async () => {
  atSweep = undefined
  atSettle = undefined
  atReach = undefined
  settleFails = false
  root = tempRoot('pom-order-')
  await mkdir(join(root, '.nexus'), { recursive: true })
  await mkdir(contextsDir(root), { recursive: true })
  await writeFile(
    join(root, '.nexus', 'nexus.json'),
    JSON.stringify({ id: 'nx', createdAt: '2026' }),
  )
  await writeFile(
    join(root, '.nexus', 'properties.json'),
    JSON.stringify({
      order: ['prop_related'],
      defs: { prop_related: { id: 'prop_related', name: 'Related', type: 'link' } },
    }),
  )
  await writeFile(
    contextsRegistryFile(root),
    JSON.stringify({ contexts: [{ id: 'ctx_projects', title: 'Projects' }] }),
  )
  await mkdir(join(contextsDir(root), 'Projects', 'Pommora'), { recursive: true })
  await writeFile(
    join(contextsDir(root), 'Projects', 'Pommora', '_space.json'),
    JSON.stringify({ id: 'sp-pom' }),
  )
  await mkdir(join(root, 'Notes'), { recursive: true })
  await writeFile(join(root, 'Notes', '_pagecollection.json'), JSON.stringify({ id: 'col-notes' }))
  await mkdir(join(root, 'Notes', 'Daily'))
  await writeFile(
    join(root, 'Notes', 'Daily', '_pageset.json'),
    JSON.stringify({ id: 'set-daily' }),
  )
  await writeFile(
    join(root, 'Notes', 'Alpha.md'),
    `---\nID: ${PAGE_A}\n<Projects>:\n  - Pommora\n---\nbody`,
  )
  await writeFile(
    join(root, 'Notes', 'Beta.md'),
    `---\nID: ${PAGE_B}\nRelated: "[[Alpha]]"\n---\nbody`,
  )
  await openSession(root)
})

afterEach(async () => {
  closeSession()
  await rm(root, { recursive: true, force: true })
})

const tagOf = async (): Promise<unknown> =>
  splitFrontmatter(await readFile(join(root, 'Notes', 'Alpha.md'), 'utf8'))['<Projects>']

const relatedOf = async (): Promise<unknown> =>
  splitFrontmatter(await readFile(join(root, 'Notes', 'Beta.md'), 'utf8')).Related

describe('the record is written before the destruction it describes', () => {
  it('a content delete records before the artifact moves', async () => {
    const r = await handleMutate(
      root,
      { op: 'delete', path: 'Notes/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(atSettle).toMatchObject({ entity: 'page', id: PAGE_A, parent: { kind: 'container' } })
  })

  it('a content delete records partial until its Link strip lands', async () => {
    const r = await handleMutate(
      root,
      { op: 'delete', path: 'Notes/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(atSettle).toMatchObject({ entity: 'page', partial: true })
    expect(atSweep).toMatchObject({ entity: 'page', partial: true })
    const after = await anyRecord()
    expect(after).toMatchObject({
      entity: 'page',
      links: [{ page: PAGE_B, property: 'prop_related', value: '[[Alpha]]' }],
    })
    expect(after).not.toHaveProperty('partial')
  })

  it('a Space delete records before the sweep strips a single tag', async () => {
    const r = await handleMutate(
      root,
      { op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(atSweep).toMatchObject({ entity: 'space', id: 'sp-pom', members: [], partial: true })
    expect(atSettle).toMatchObject({ entity: 'space', members: [{ id: PAGE_A, kind: 'page' }] })
    expect(atSettle).not.toMatchObject({ partial: true })
  })

  it('a Context delete records before the sweep and the registry erase', async () => {
    const r = await handleMutate(
      root,
      { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(atSweep).toMatchObject({
      entity: 'context',
      registry: { id: 'ctx_projects' },
      membership: [],
      partial: true,
    })
    expect(atSettle).toMatchObject({ entity: 'context', membership: [{ root: { id: PAGE_A } }] })
  })

  it('system-trash mode records nothing and mints no bundle', async () => {
    const r = await handleMutate(
      root,
      { op: 'delete', path: 'Notes/Alpha.md', kind: 'page' },
      { trashMode: 'system', trashToSystem: async () => {} },
    )
    expect(r.ok).toBe(true)
    expect(await anyRecord()).toBeUndefined()
    expect(await relatedOf()).toBeUndefined()
  })
})

describe('the strip runs after the artifact moves', () => {
  it('a page delete that dies before the settle strips nothing', async () => {
    settleFails = true
    const r = await handleMutate(
      root,
      { op: 'delete', path: 'Notes/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
    expect(await pathExists(join(root, 'Notes', 'Alpha.md'))).toBe(true)
    expect(await relatedOf()).toBe('[[Alpha]]')
  })
})

describe('the configuration pass runs after the artifact moves', () => {
  for (const [path, kind] of [
    ['Notes/Daily', 'set'],
    ['.nexus/contexts/Projects/Pommora', 'space'],
    ['.nexus/contexts/Projects', 'context'],
  ] as const) {
    it(`a ${kind} delete finds its folder gone`, async () => {
      deleting = join(root, path)
      const r = await handleMutate(root, { op: 'delete', path, kind }, nexusDeps)
      expect(r.ok).toBe(true)
      expect(atReach).toBe(false)
    })
  }
})

describe('one unparseable page never fails the sweep around it', () => {
  // A hand-written tab indent and an unresolvable alias are the two ways frontmatter refuses a field write. Either one used to abort the fan-out mid-destruction.
  const BROKEN = {
    'Tabbed.md': '---\nID: 01KVGMT8BFP350FZZXAMG1QDVX\n<Projects>:\n\t- Pommora\n---\nb',
    'Aliased.md': '---\nID: 01KVGMT8BFP350FZZXAMG1QDVY\nsomething: *word\n---\nb',
  }

  for (const [name, content] of Object.entries(BROKEN)) {
    it(`a Context delete completes past ${name}, and leaves it byte-identical`, async () => {
      await writeFile(join(root, 'Notes', name), content)
      const r = await handleMutate(
        root,
        { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
        nexusDeps,
      )
      expect(r.ok).toBe(true)
      expect(await tagOf()).toBeUndefined()
      expect(await pathExists(join(contextsDir(root), 'Projects'))).toBe(false)
      // The page nobody can parse is untouched, and the record admits the sweep was thin.
      expect(await readFile(join(root, 'Notes', name), 'utf8')).toBe(content)
      expect(await anyRecord()).toMatchObject({ entity: 'context', partial: true })
    })
  }
})

describe('a deletion cut short leaves evidence, never silence', () => {
  it('a content delete that dies before the settle keeps the artifact and skips the listing', async () => {
    settleFails = true
    const r = await handleMutate(
      root,
      { op: 'delete', path: 'Notes/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
    expect(await pathExists(join(root, 'Notes', 'Alpha.md'))).toBe(true)
    // The record survives as evidence, and the listing refuses to offer an unfinished deletion.
    expect(await anyRecord()).toMatchObject({ entity: 'page', id: PAGE_A })
    expect(await listBundles(root)).toHaveLength(0)
  })

  it('a Space delete that dies before the settle still names what the sweep took', async () => {
    settleFails = true
    const r = await handleMutate(
      root,
      { op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
    expect(await tagOf()).toBeUndefined()
    expect(await pathExists(join(contextsDir(root), 'Projects', 'Pommora'))).toBe(true)
    expect(await anyRecord()).toMatchObject({ members: [{ id: PAGE_A, kind: 'page' }] })
    expect(await listBundles(root)).toHaveLength(0)
  })
})

describe('a page delete waits out a save in flight', () => {
  it('trashes the saved page rather than leaving the save to recreate it', async () => {
    const file = join(root, 'Notes', 'Alpha.md')
    let release!: () => void
    const gate = new Promise<void>((r) => {
      release = r
    })
    const lock = lockContention(file)
    const save = machine().lock(file, async () => {
      await gate
      await writeFile(file, 'saved')
    })
    const del = handleMutate(
      root,
      { op: 'delete', path: 'Notes/Alpha.md', kind: 'page' },
      nexusDeps,
    )
    await lock.contended
    lock.restore()
    release()
    await save
    const r = await del
    if (!r.ok || !r.value.trashed) throw new Error('the delete did not trash')
    expect(await pathExists(file)).toBe(false)
    expect(await readFile(join(root, r.value.trashed.bundlePath, 'Alpha.md'), 'utf8')).toBe('saved')
  })
})
