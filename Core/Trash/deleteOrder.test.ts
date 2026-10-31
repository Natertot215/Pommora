// A delete's record must exist on disk BEFORE the step that destroys what it describes. Every assertion here is taken from inside the arm's real code — the collaborators are wrapped, never replaced — because ordering is invisible to an after-the-fact assertion.

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { splitFrontmatter } from '../Files/pageFile'
import { dirname, join } from '../Paths/posix'
import { tempRoot, readJsonAt, seedNexus } from '../Testing/hostFs'
import { lockContention } from '../Testing/machines'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pathExists } from '../Files/atomicWrite'
import { handleMutate } from '../Nexus/mutate'
import { contextsDir, contextsRegistryFile } from '../Paths/paths'
import { listBundles } from '../Bundles/bundle'
import { machine } from '../Platform/machine'
import { closeSession, openSession } from '../Nexus/session'
import { readNotes } from '../Nexus/owed'
import { bundleOf } from '../Testing/settledMutate'

const PAGE_A = '01KVGMT8BFP350FZZXAMG1QDVA'
const PAGE_B = '01KVGMT8BFP350FZZXAMG1QDVB'

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

vi.mock('../Files/atomicWrite', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../Files/atomicWrite')>()
  return {
    ...actual,
    relocate: async (...args: Parameters<typeof actual.relocate>) => {
      const bundleDir = dirname(args[1])
      if (bundleDir.endsWith('.deleted')) {
        atSettle = await actual.readJsonObject(join(bundleDir, '_record.json'))
        if (settleFails) throw new Error('the process died before the artifact moved')
      }
      return actual.relocate(...args)
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
  await seedNexus(root, {
    defs: [{ id: 'prop_related', label: 'Related', key: 'Related', type: 'link' }],
  })
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
    const r = await handleMutate(root, { op: 'delete', path: 'Notes/Alpha.md', kind: 'page' })
    expect(r.ok).toBe(true)
    expect(atSettle).toMatchObject({ entity: 'page', id: PAGE_A, parent: { kind: 'container' } })
  })

  it('a content delete records the Link values its strip takes before its strip', async () => {
    const r = await handleMutate(root, { op: 'delete', path: 'Notes/Alpha.md', kind: 'page' })
    expect(r.ok).toBe(true)
    expect(atSettle).not.toHaveProperty('links')
    expect(atSweep).toMatchObject({
      entity: 'page',
      links: [{ page: PAGE_B, property: 'prop_related', value: '[[Alpha]]' }],
    })
    expect(await anyRecord()).toEqual(atSweep)
  })

  it('a Space delete records what its holders held before the move strips a single tag', async () => {
    const r = await handleMutate(root, {
      op: 'delete',
      path: '.nexus/contexts/Projects/Pommora',
      kind: 'space',
    })
    expect(r.ok).toBe(true)
    expect(atSettle).toMatchObject({ entity: 'space', members: [{ id: PAGE_A, kind: 'page' }] })
    expect(atSettle).not.toMatchObject({ partial: true })
    expect(atSweep).toEqual(atSettle)
  })

  it('a Context delete records what its holders held before the move and the strip', async () => {
    const r = await handleMutate(root, {
      op: 'delete',
      path: '.nexus/contexts/Projects',
      kind: 'context',
    })
    expect(r.ok).toBe(true)
    expect(atSettle).toMatchObject({
      entity: 'context',
      registry: { id: 'ctx_projects' },
      membership: [{ root: { id: PAGE_A } }],
    })
    expect(atSettle).not.toMatchObject({ partial: true })
    expect(atSweep).toEqual(atSettle)
  })

  it('a delete from the Archive records before its strip', async () => {
    const archived = await handleMutate(root, {
      op: 'archive',
      path: 'Notes/Alpha.md',
      kind: 'page',
    })
    const archive = bundleOf(archived)
    expect(archive).toBeDefined()
    const r = await handleMutate(root, { op: 'delete', path: archive!, kind: 'page' })
    expect(r.ok).toBe(true)
    expect(atSettle).toMatchObject({ entity: 'page' })
    expect(atSettle).not.toHaveProperty('links')
    expect(atSweep).toMatchObject({
      entity: 'page',
      links: [{ page: PAGE_B, property: 'prop_related', value: '[[Alpha]]' }],
    })
  })
})

describe('the strip runs after the artifact moves', () => {
  it('a page delete that dies before the settle strips nothing', async () => {
    settleFails = true
    const r = await handleMutate(root, { op: 'delete', path: 'Notes/Alpha.md', kind: 'page' })
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
      const r = await handleMutate(root, { op: 'delete', path, kind })
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
      const r = await handleMutate(root, {
        op: 'delete',
        path: '.nexus/contexts/Projects',
        kind: 'context',
      })
      expect(r.ok).toBe(true)
      expect(await tagOf()).toBeUndefined()
      expect(await pathExists(join(contextsDir(root), 'Projects'))).toBe(false)
      // The page nobody can rewrite is untouched, and the record still holds the page the strip reached.
      expect(await readFile(join(root, 'Notes', name), 'utf8')).toBe(content)
      expect(await anyRecord()).toMatchObject({
        entity: 'context',
        membership: expect.arrayContaining([
          expect.objectContaining({ root: { id: PAGE_A, kind: 'page' } }),
        ]),
      })
    })
  }
})

describe('a delete whose move fails deletes nothing', () => {
  it('a content delete whose move throws keeps the artifact and leaves no bundle', async () => {
    settleFails = true
    const r = await handleMutate(root, { op: 'delete', path: 'Notes/Alpha.md', kind: 'page' })
    expect(r.ok).toBe(false)
    expect(await pathExists(join(root, 'Notes', 'Alpha.md'))).toBe(true)
    expect(await anyRecord()).toBeUndefined()
    expect(await listBundles(root, { kind: 'trash' })).toHaveLength(0)
    expect(await readNotes(root)).toEqual({})
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
    const del = handleMutate(root, { op: 'delete', path: 'Notes/Alpha.md', kind: 'page' })
    await lock.contended
    lock.restore()
    release()
    await save
    const r = await del
    if (!bundleOf(r)) throw new Error('the delete did not trash')
    expect(await pathExists(file)).toBe(false)
    expect(await readFile(join(root, bundleOf(r), 'Alpha.md'), 'utf8')).toBe('saved')
  })
})
