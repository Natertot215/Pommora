// After every maintaining seam fires, the rows it kept current are byte-identical to a from-scratch reconcile of the same disk.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ASSETS_DIR_REL } from '../Paths/nexusPaths'
import { mkdtemp, rm, mkdir, writeFile, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { handleMutate, type MutateDeps } from '../Nexus/mutate'
import { openSession, closeSession } from '../Nexus/session'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import { createProperty } from '../Properties/registryProperty'
import { listBundles } from '../Trash/spend'
import { seedContentIndex } from './indexSeed'
import { queryKeyHolders, queryMembers, queryMentions } from './contentIndex'
import { applyWatchEvents } from '../Nexus/watchPatch'
import { dropLiveTree, refreshTree } from '../Nexus/liveTree'

const A_ID = '01KVGMT8BFP350FZZXAMG1QDRA'
const B_ID = '01KVGMT8BFP350FZZXAMG1QDRB'

let root: string
let mem: ReturnType<typeof memoryStores>
const deps: MutateDeps = { trashMode: 'nexus', trashToSystem: async () => {} }

const byPath = <T extends { path: string }>(rows: T[], ...keys: (keyof T)[]): T[] =>
  rows.sort((a, b) => {
    for (const key of ['path', ...keys] as (keyof T)[]) {
      const d = String(a[key]).localeCompare(String(b[key]))
      if (d) return d
    }
    return 0
  })

const dump = (): unknown => ({
  mentions: byPath([...mem.index.mentions.values()], 'title'),
  values: byPath([...mem.index.values.values()], 'key'),
  memberships: byPath([...mem.index.memberships.values()], 'key', 'title'),
})

async function expectMaintained(): Promise<void> {
  const maintained = dump()
  mem.index.mentions.clear()
  mem.index.values.clear()
  mem.index.memberships.clear()
  mem.index.stats.clear()
  await seedContentIndex(root)
  expect(maintained).toEqual(dump())
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-imaint-'))
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
  dropLiveTree()
  installStores(NO_STORES)
  closeSession()
  await rm(root, { recursive: true, force: true })
})

describe('the writers maintain the rows', () => {
  it('a page rename moves its rows and re-points every mentioning page — cascade included', async () => {
    const r = await handleMutate(
      { op: 'rename', path: 'Notes/Daily/Beta.md', kind: 'page', newName: 'Gamma' },
      deps,
    )
    expect(r.ok).toBe(true)
    expect(queryMentions('gamma')).toEqual(['Notes/Daily/Alpha.md'])
    expect(queryMentions('beta')).toEqual([])
    await expectMaintained()
  })

  it('a folder rename prefix-moves every row beneath it', async () => {
    const r = await handleMutate(
      { op: 'rename', path: 'Notes/Daily', kind: 'set', newName: 'Weekly' },
      deps,
    )
    expect(r.ok).toBe(true)
    expect(queryMentions('beta')).toEqual(['Notes/Weekly/Alpha.md'])
    await expectMaintained()
  })

  it('a property write lands in page_values; a create is born indexed', async () => {
    await createProperty(root, { id: 'prop_s', name: 'Stage', type: 'select' })
    const set = await handleMutate(
      {
        op: 'setProperty',
        path: 'Notes/Daily/Alpha.md',
        propertyId: 'prop_s',
        value: { kind: 'select', value: 'Open' },
      },
      deps,
    )
    expect(set.ok).toBe(true)
    expect(queryKeyHolders('Stage')).toEqual(['Notes/Daily/Alpha.md'])
    const created = await handleMutate(
      { op: 'createPage', parentPath: 'Notes', name: 'Fresh' },
      deps,
    )
    expect(created.ok).toBe(true)
    await expectMaintained()
  })

  it('a context write lands in memberships; a Space rename and delete each keep them current', async () => {
    const tagged = await handleMutate(
      {
        op: 'setContext',
        path: 'Notes/Daily/Alpha.md',
        contextId: 'ctx_projects',
        spaceIds: ['sp-pom'],
      },
      deps,
    )
    expect(tagged.ok).toBe(true)
    expect(queryMembers('<Projects>', 'pommora')).toEqual(['Notes/Daily/Alpha.md'])
    await expectMaintained()
    const renamed = await handleMutate(
      { op: 'renameSpace', spaceId: 'sp-pom', newName: 'Pom' },
      deps,
    )
    expect(renamed.ok).toBe(true)
    expect(queryMembers('<Projects>', 'pommora')).toEqual([])
    expect(queryMembers('<Projects>', 'pom')).toEqual(['Notes/Daily/Alpha.md'])
    await expectMaintained()
    const deleted = await handleMutate(
      { op: 'delete', path: '.nexus/contexts/Projects/Pom', kind: 'space' },
      deps,
    )
    expect(deleted.ok).toBe(true)
    expect(queryMembers('<Projects>')).toEqual([])
    await expectMaintained()
  })

  it('an icon write re-indexes the page it touched', async () => {
    const r = await handleMutate(
      { op: 'setIcon', path: 'Notes/Daily/Alpha.md', kind: 'page', icon: 'star' },
      deps,
    )
    expect(r.ok).toBe(true)
    expect(queryKeyHolders('icon')).toEqual(['Notes/Daily/Alpha.md'])
    await expectMaintained()
  })

  it('a delete clears the rows; a restore reseeds them', async () => {
    const del = await handleMutate(
      { op: 'delete', path: 'Notes/Daily/Beta.md', kind: 'page' },
      deps,
    )
    expect(del.ok).toBe(true)
    expect(queryMentions('beta')).toEqual(['Notes/Daily/Alpha.md'])
    await expectMaintained()
    const [listed] = await listBundles(root)
    const restored = await handleMutate({ op: 'restore', bundlePath: listed.bundlePath }, deps)
    expect(restored.ok).toBe(true)
    await expectMaintained()
  })

  it('a page move re-keys its rows', async () => {
    const r = await handleMutate(
      { op: 'movePage', path: 'Notes/Daily/Beta.md', newParentPath: 'Notes' },
      deps,
    )
    expect(r.ok).toBe(true)
    const scratch = dump() as { mentions: unknown[] }
    expect(scratch.mentions).toEqual([{ path: 'Notes/Daily/Alpha.md', title: 'beta' }])
    await expectMaintained()
  })
})

describe('the watcher maintains the rows', () => {
  it('an external add, edit, and unlink each land; an un-adopted note rides index-only', async () => {
    await refreshTree(root)
    await mkdir(join(root, 'Loose'), { recursive: true })
    await writeFile(join(root, 'Loose', 'Note.md'), 'links [[Alpha]]\n')
    const added = await applyWatchEvents(
      root,
      [{ event: 'add', absPath: join(root, 'Loose', 'Note.md') }],
      { excluded: [], assetDir: ASSETS_DIR_REL },
    )
    expect(added).toBe('patched')
    expect(queryMentions('alpha')).toEqual(['Loose/Note.md'])
    await expectMaintained()
    await writeFile(join(root, 'Notes', 'Daily', 'Beta.md'), `---\nID: ${B_ID}\n---\n\n[[Alpha]]`)
    expect(
      await applyWatchEvents(
        root,
        [{ event: 'change', absPath: join(root, 'Notes', 'Daily', 'Beta.md') }],
        { excluded: [], assetDir: ASSETS_DIR_REL },
      ),
    ).toBe('patched')
    expect(queryMentions('alpha')?.sort()).toEqual(['Loose/Note.md', 'Notes/Daily/Beta.md'])
    await unlink(join(root, 'Loose', 'Note.md'))
    expect(
      await applyWatchEvents(root, [{ event: 'unlink', absPath: join(root, 'Loose', 'Note.md') }], {
        excluded: [],
        assetDir: ASSETS_DIR_REL,
      }),
    ).toBe('patched')
    await expectMaintained()
  })
})
