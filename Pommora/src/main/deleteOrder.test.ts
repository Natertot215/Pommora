// The write-ahead pins: a delete's record must exist on disk BEFORE the step that destroys what
// it describes. Every assertion here is taken from inside the arm's real code — the collaborators
// are wrapped, never replaced — because ordering is invisible to an after-the-fact assertion.

import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pathExists } from './IO/atomicWrite'
import { handleMutate, type MutateDeps } from './mutate'
import { contextsDir, contextsRegistryFile } from './paths'
import { listBundles } from './provenance'
import { splitFrontmatter } from './readNexus'
import { closeSession, openSession } from './session'

const PAGE_A = '01KVGMT8BFP350FZZXAMG1QDVA'
const nexusDeps: MutateDeps = { trashMode: 'nexus', trashToSystem: async () => {} }

let root: string
/** The record as it stood when the destructive step ran — the whole point of these tests. */
let atSweep: unknown
let atSettle: unknown
let settleFails = false

async function firstRecordUnder(dir: string): Promise<unknown> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  for (const e of entries) {
    if (!e.isDirectory()) continue
    const hit = join(dir, e.name, '_record.json')
    if (await pathExists(hit)) return JSON.parse(await readFile(hit, 'utf8'))
    const deeper = await firstRecordUnder(join(dir, e.name))
    if (deeper !== undefined) return deeper
  }
  return undefined
}

/** The one record under .trash, whatever bundle holds it. */
const anyRecord = (): Promise<unknown> => firstRecordUnder(join(root, '.trash'))

vi.mock('./CRUD/contextCascade', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./CRUD/contextCascade')>()
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

vi.mock('./IO/atomicWrite', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./IO/atomicWrite')>()
  return {
    ...actual,
    settleBundle: async (bundleDir: string, absPath: string) => {
      atSettle = await actual.readJsonObject(join(bundleDir, '_record.json'))
      if (settleFails) throw new Error('the process died before the artifact moved')
      return actual.settleBundle(bundleDir, absPath)
    },
  }
})

beforeEach(async () => {
  atSweep = undefined
  atSettle = undefined
  settleFails = false
  root = await mkdtemp(join(tmpdir(), 'pom-order-'))
  await mkdir(join(root, '.nexus'), { recursive: true })
  await writeFile(
    join(root, '.nexus', 'nexus.json'),
    JSON.stringify({ id: 'nx', createdAt: '2026' }),
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
  await writeFile(
    join(root, 'Notes', 'Alpha.md'),
    `---\nID: ${PAGE_A}\n<Projects>:\n  - Pommora\n---\nbody`,
  )
  await openSession(root)
})

afterEach(async () => {
  closeSession()
  await rm(root, { recursive: true, force: true })
})

const tagOf = async (): Promise<unknown> =>
  splitFrontmatter(await readFile(join(root, 'Notes', 'Alpha.md'), 'utf8'))['<Projects>']

describe('the record is written before the destruction it describes', () => {
  it('a content delete records before the artifact moves', async () => {
    const r = await handleMutate({ op: 'delete', path: 'Notes/Alpha.md', kind: 'page' }, nexusDeps)
    expect(r.ok).toBe(true)
    expect(atSettle).toMatchObject({ entity: 'page', id: PAGE_A, parent: { kind: 'container' } })
  })

  it('a Space delete records before the sweep strips a single tag', async () => {
    const r = await handleMutate(
      { op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    // The pre-sweep record knows its identity and admits it is thinner than the truth.
    expect(atSweep).toMatchObject({ entity: 'space', id: 'sp-pom', members: [], partial: true })
    // The membership the sweep captured is patched in before the artifact settles.
    expect(atSettle).toMatchObject({ entity: 'space', members: [{ id: PAGE_A, kind: 'page' }] })
    expect(atSettle).not.toMatchObject({ partial: true })
  })

  it('a Context delete records before the sweep and the registry erase', async () => {
    const r = await handleMutate(
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
      { op: 'delete', path: 'Notes/Alpha.md', kind: 'page' },
      { trashMode: 'system', trashToSystem: async () => {} },
    )
    expect(r.ok).toBe(true)
    expect(await anyRecord()).toBeUndefined()
  })
})

describe('one unparseable page never fails the sweep around it', () => {
  // A hand-written tab indent and an unresolvable alias are the two ways frontmatter refuses a
  // field write. Either one used to abort the fan-out mid-destruction.
  const BROKEN = {
    'Tabbed.md': '---\nID: 01KVGMT8BFP350FZZXAMG1QDVX\n<Projects>:\n\t- Pommora\n---\nb',
    'Aliased.md': '---\nID: 01KVGMT8BFP350FZZXAMG1QDVY\nsomething: *word\n---\nb',
  }

  for (const [name, content] of Object.entries(BROKEN)) {
    it(`a Context delete completes past ${name}, and leaves it byte-identical`, async () => {
      await writeFile(join(root, 'Notes', name), content)
      const r = await handleMutate(
        { op: 'delete', path: '.nexus/contexts/Projects', kind: 'context' },
        nexusDeps,
      )
      expect(r.ok).toBe(true)
      // The sweep reached every page it could, and the erase and the move both landed.
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
    const r = await handleMutate({ op: 'delete', path: 'Notes/Alpha.md', kind: 'page' }, nexusDeps)
    expect(r.ok).toBe(false)
    // Nothing was destroyed — the page is still exactly where it was.
    expect(await pathExists(join(root, 'Notes', 'Alpha.md'))).toBe(true)
    // The record survives as evidence, and the listing refuses to offer an unfinished deletion.
    expect(await anyRecord()).toMatchObject({ entity: 'page', id: PAGE_A })
    expect(await listBundles(root)).toHaveLength(0)
  })

  it('a Space delete that dies before the settle still names what the sweep took', async () => {
    settleFails = true
    const r = await handleMutate(
      { op: 'delete', path: '.nexus/contexts/Projects/Pommora', kind: 'space' },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
    // The sweep already ran, and the Space folder is still live — the accepted cost of ordering
    // the record first. What it took is hand-readable in the record rather than lost.
    expect(await tagOf()).toBeUndefined()
    expect(await pathExists(join(contextsDir(root), 'Projects', 'Pommora'))).toBe(true)
    expect(await anyRecord()).toMatchObject({ members: [{ id: PAGE_A, kind: 'page' }] })
    expect(await listBundles(root)).toHaveLength(0)
  })
})
