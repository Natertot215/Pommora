// After every maintaining seam fires, the rows it kept current are byte-identical to a from-scratch reconcile of the same disk.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { newContentId } from '../Nexus/ids'
import { rm, mkdir, readFile, stat, writeFile, unlink } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { tempRoot } from '../Testing/hostFs'
import { settledMutate } from '../Testing/settledMutate'
import { openSession, closeSession } from '../Nexus/session'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import { createProperty } from '../Properties/registryProperty'
import { listBundles } from '../Bundles/bundle'
import { seedContentIndex } from './indexSeed'
import * as contentIndex from './contentIndex'
import { queryKeyHolders, queryMembers, queryMentions, readIndexedStat } from './contentIndex'
import { applyEvents, owedFor } from '../Nexus/fileEvents'
import { dropLiveTree, refreshTree } from '../Nexus/liveTree'
import { settleBatch } from '../Nexus/settle'
import { homepageDir } from '../Paths/paths'
import { machine } from '../Platform/machine'
import { createTile, writeMarkdownTile } from '../Tiles/tilesFile'
import { landedId } from '../Testing/tileLayouts'
import { type FileEvent, noteOwn } from '../Files/writeEcho'
import { sweepGovernedRoots } from '../Nexus/governedSweep'

const A_ID = '01KVGMT8BFP350FZZXAMG1QDRA'
const B_ID = '01KVGMT8BFP350FZZXAMG1QDRB'

let root: string
let mem: ReturnType<typeof memoryStores>

const byPath = <T extends { path: string }>(rows: T[], ...keys: (keyof T)[]): T[] =>
  rows.sort((a, b) => {
    for (const key of ['path', ...keys] as (keyof T)[]) {
      const d = String(a[key]).localeCompare(String(b[key]))
      if (d) return d
    }
    return 0
  })

const dump = (): unknown => ({
  relations: byPath([...mem.index.relations.values()], 'kind', 'target', 'qualifier', 'key'),
  values: byPath([...mem.index.values.values()], 'key'),
})

async function expectMaintained(): Promise<void> {
  const maintained = dump()
  mem.index.relations.clear()
  mem.index.values.clear()
  mem.index.stats.clear()
  await seedContentIndex(root)
  expect(maintained).toEqual(dump())
}

beforeEach(async () => {
  root = tempRoot('pom-imaint-')
  await mkdir(join(root, '.nexus'), { recursive: true })
  await mkdir(join(root, 'Notes', 'Daily'), { recursive: true })
  await writeFile(join(root, '.nexus', 'nexus.json'), JSON.stringify({ id: 'nx', createdAt: 'x' }))
  await writeFile(join(root, '.nexus', 'settings.json'), '{}')
  await mkdir(join(root, '.nexus', 'contexts', 'Projects', 'Pommora'), { recursive: true })
  await writeFile(
    join(root, '.nexus', 'contexts', 'contexts.json'),
    JSON.stringify({ contexts: [{ id: 'ctx_projects', title: 'Projects' }] }),
  )
  await writeFile(
    join(root, '.nexus', 'contexts', 'Projects', 'Pommora', '_space.json'),
    JSON.stringify({ id: 'sp-pom' }),
  )
  await writeFile(join(root, 'Notes', '_pagecollection.json'), JSON.stringify({ id: 'c1' }))
  await writeFile(join(root, 'Notes', 'Daily', '_pageset.json'), JSON.stringify({ id: 's1' }))
  await writeFile(
    join(root, 'Notes', 'Daily', 'Alpha.md'),
    `---\nID: ${A_ID}\n---\n\nSee [[Beta]] for more.`,
  )
  await writeFile(join(root, 'Notes', 'Daily', 'Beta.md'), `---\nID: ${B_ID}\n---\n\nbody`)
  await openSession(root)
  mem = memoryStores()
  installStores(mem.stores)
  await seedContentIndex(root)
})
afterEach(async () => {
  vi.restoreAllMocks()
  dropLiveTree()
  installStores(NO_STORES)
  closeSession()
  await rm(root, { recursive: true, force: true })
})

describe('the writers maintain the rows', () => {
  it('a page rename moves its rows and re-points every mentioning page — cascade included', async () => {
    const r = await settledMutate(root, {
      op: 'rename',
      path: 'Notes/Daily/Beta.md',
      kind: 'page',
      newName: 'Gamma',
    })
    expect(r.ok).toBe(true)
    expect(queryMentions(['gamma'])).toEqual(['Notes/Daily/Alpha.md'])
    expect(queryMentions(['beta'])).toEqual([])
    await expectMaintained()
  })

  it('a page rename reaches the renamed page’s own links through the index', async () => {
    await writeFile(
      join(root, 'Notes', 'Daily', 'Beta.md'),
      `---\nID: ${B_ID}\n---\n\n## Part\n\n[[Beta#Part]]`,
    )
    await seedContentIndex(root)
    const r = await settledMutate(root, {
      op: 'rename',
      path: 'Notes/Daily/Beta.md',
      kind: 'page',
      newName: 'Gamma',
    })
    expect(r.ok && r.value.cascade?.warning).toBeUndefined()
    expect(await readFile(join(root, 'Notes', 'Daily', 'Gamma.md'), 'utf8')).toContain(
      '[[Gamma#Part]]',
    )
    await expectMaintained()
  })

  it('a folder rename prefix-moves every row beneath it', async () => {
    const r = await settledMutate(root, {
      op: 'rename',
      path: 'Notes/Daily',
      kind: 'set',
      newName: 'Weekly',
    })
    expect(r.ok).toBe(true)
    expect(queryMentions(['beta'])).toEqual(['Notes/Weekly/Alpha.md'])
    await expectMaintained()
  })

  it('a property write lands in page_values; a create is born indexed', async () => {
    await createProperty(root, {
      id: 'prop_s',
      label: 'Stage',
      type: 'select',
      select_options: [{ id: 'opt_open', key: 'Open', label: 'Open' }],
    })
    const set = await settledMutate(root, {
      op: 'setProperty',
      path: 'Notes/Daily/Alpha.md',
      propertyId: 'prop_s',
      value: { kind: 'select', value: 'opt_open' },
    })
    expect(set.ok).toBe(true)
    expect(queryKeyHolders('Stage')).toEqual(['Notes/Daily/Alpha.md'])
    const created = await settledMutate(root, {
      op: 'createPage',
      id: newContentId('page'),
      parentPath: 'Notes',
      name: 'Fresh',
    })
    expect(created.ok).toBe(true)
    await expectMaintained()
  })

  it('a context write lands as a space row; a Space rename and delete each keep it current', async () => {
    const tagged = await settledMutate(root, {
      op: 'setContext',
      path: 'Notes/Daily/Alpha.md',
      contextId: 'ctx_projects',
      spaceIds: ['sp-pom'],
    })
    expect(tagged.ok).toBe(true)
    expect(queryMembers('<Projects>', 'Pommora')).toEqual(['Notes/Daily/Alpha.md'])
    await expectMaintained()
    const renamed = await settledMutate(root, {
      op: 'renameSpace',
      spaceId: 'sp-pom',
      newName: 'Pom',
    })
    expect(renamed.ok).toBe(true)
    expect(queryMembers('<Projects>', 'Pommora')).toEqual([])
    expect(queryMembers('<Projects>', 'Pom')).toEqual(['Notes/Daily/Alpha.md'])
    await expectMaintained()
    await refreshTree(root)
    const deleted = await settledMutate(root, {
      op: 'delete',
      path: '.nexus/contexts/Projects/Pom',
      kind: 'space',
    })
    expect(deleted.ok).toBe(true)
    expect(queryMembers('<Projects>')).toEqual([])
    await expectMaintained()
  })

  it('a delete moves its rows under its bundle; a restore indexes what came back', async () => {
    const del = await settledMutate(root, {
      op: 'delete',
      path: 'Notes/Daily/Beta.md',
      kind: 'page',
    })
    expect(del.ok).toBe(true)
    expect(queryMentions(['beta'])).toEqual(['Notes/Daily/Alpha.md'])
    await expectMaintained()
    const [listed] = await listBundles(root, { kind: 'trash' })
    const restored = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath })
    expect(restored.ok).toBe(true)
    await expectMaintained()
  })

  it('a Set delete moves every row beneath it under its bundle; its restore moves each back', async () => {
    const del = await settledMutate(root, { op: 'delete', path: 'Notes/Daily', kind: 'set' })
    expect(del.ok).toBe(true)
    const [listed] = await listBundles(root, { kind: 'trash' })
    expect(queryMentions(['beta'])).toEqual([`${listed.bundlePath}/Daily/Alpha.md`])
    const restored = await settledMutate(root, { op: 'restore', bundlePath: listed.bundlePath })
    expect(restored.ok).toBe(true)
    expect(queryMentions(['beta'])).toEqual(['Notes/Daily/Alpha.md'])
    await expectMaintained()
  })

  it('a page move re-keys its rows', async () => {
    const r = await settledMutate(root, {
      op: 'movePage',
      path: 'Notes/Daily/Beta.md',
      newParentPath: 'Notes',
    })
    expect(r.ok).toBe(true)
    const scratch = dump() as { relations: unknown[] }
    expect(scratch.relations).toEqual([
      {
        path: 'Notes/Daily/Alpha.md',
        kind: 'body',
        target: 'beta',
        qualifier: '',
        key: '',
      },
    ])
    await expectMaintained()
  })
})

describe('the own tap indexes a batch', () => {
  it('one noteOwn commits its written pages 200 a transaction', async () => {
    const pages = Array.from({ length: 201 }, (_, i) => join(root, 'Notes', 'Daily', `P${i}.md`))
    for (const p of pages) await writeFile(p, `page ${p}\n`)
    const own = (absPath: string): FileEvent => ({ event: 'add', absPath, origin: 'own' })
    const upserts = vi.spyOn(contentIndex, 'upsertPageIndexes')
    const committed = async (evs: FileEvent[]): Promise<number[]> => {
      upserts.mockClear()
      await noteOwn(...evs)
      return upserts.mock.calls.map(([rows]) => rows.length)
    }
    expect(await committed(pages.slice(0, 70).map(own))).toEqual([70])
    expect(await committed([own(pages[70])])).toEqual([1])
    expect(await committed(pages.map(own))).toEqual([200, 1])
    await expectMaintained()
  })

  it('a swept page is stat’ed once, and the index records the stat its landing answered', async () => {
    const rels = ['Notes/Daily/Alpha.md', 'Notes/Daily/Beta.md']
    const files = rels.map((rel) => join(root, rel))
    const stats = vi.spyOn(machine(), 'stat')
    const r = await sweepGovernedRoots(files, { raw: (raw) => ({ ...raw, Tags: ['b'] }) })
    expect([...r.touched.keys()]).toEqual(files)
    for (const file of files) expect(stats.mock.calls.filter(([p]) => p === file)).toHaveLength(1)
    for (const [i, rel] of rels.entries()) {
      const { mtimeMs, size, ctimeMs } = await stat(files[i])
      expect(readIndexedStat(rel)).toMatchObject({ mtimeMs, size, ctimeMs })
    }
    const reads = vi.spyOn(machine(), 'readText')
    await seedContentIndex(root)
    expect(reads.mock.calls.filter(([p]) => files.includes(p))).toEqual([])
  })
})

describe('the watcher maintains the rows', () => {
  it('an external add, edit, and unlink each land; an un-adopted note rides index-only', async () => {
    await refreshTree(root)
    await mkdir(join(root, 'Loose'), { recursive: true })
    await writeFile(join(root, 'Loose', 'Note.md'), 'links [[Alpha]]\n')
    await applyEvents(root, [
      { event: 'add', absPath: join(root, 'Loose', 'Note.md'), origin: 'watched' },
    ])
    expect(owedFor(root).walk).toBe(false)
    expect(queryMentions(['alpha'])).toEqual(['Loose/Note.md'])
    await expectMaintained()
    await writeFile(join(root, 'Notes', 'Daily', 'Beta.md'), `---\nID: ${B_ID}\n---\n\n[[Alpha]]`)
    await applyEvents(root, [
      { event: 'change', absPath: join(root, 'Notes', 'Daily', 'Beta.md'), origin: 'watched' },
    ])
    expect(owedFor(root).walk).toBe(false)
    expect(queryMentions(['alpha'])?.sort()).toEqual(['Loose/Note.md', 'Notes/Daily/Beta.md'])
    await unlink(join(root, 'Loose', 'Note.md'))
    await applyEvents(root, [
      { event: 'unlink', absPath: join(root, 'Loose', 'Note.md'), origin: 'watched' },
    ])
    expect(owedFor(root).walk).toBe(false)
    await expectMaintained()
  })

  it('an external heading rename reports the pages and tile hosts its cascade rewrote', async () => {
    const beta = join(root, 'Notes', 'Daily', 'Beta.md')
    const alpha = join(root, 'Notes', 'Daily', 'Alpha.md')
    await writeFile(beta, `---\nID: ${B_ID}\n---\n\n## Setup\n`)
    await writeFile(alpha, `---\nID: ${A_ID}\n---\n\nSee [[Beta#Setup]].`)
    const tile = await landedId(createTile(root, homepageDir(root), { kind: 'append' }))
    await writeMarkdownTile(homepageDir(root), tile, '[[Beta#Setup]]', machine().sha256Hex(''))
    await seedContentIndex(root)
    await refreshTree(root)
    await writeFile(beta, `---\nID: ${B_ID}\n---\n\n## Intro\n`)
    const pushed: [string, unknown][] = []
    const pusher = { push: (c: string, v: unknown) => pushed.push([c, v]), watch: async () => {} }
    await settleBatch(pusher, root, [{ event: 'change', absPath: beta, origin: 'watched' }])
    expect(pushed).toContainEqual([
      'pages:changed',
      expect.arrayContaining(['Notes/Daily/Alpha.md']),
    ])
    expect(pushed.filter(([c]) => c === 'tiles:changed')).toEqual([
      ['tiles:changed', { host: { kind: 'homepage' }, ids: [tile] }],
    ])
    expect(await readFile(alpha, 'utf8')).toContain('[[Beta#Intro]]')
    await expectMaintained()
  })
})
