// Task 9's must-agree: after every maintaining seam fires, the rows it kept current are
// byte-identical to a from-scratch reconcile of the same disk.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ASSETS_DIR_REL } from '@shared/nexusPaths'
import { mkdtemp, rm, mkdir, writeFile, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { handleMutate, type MutateDeps } from './mutate'
import { openSession, closeSession } from './session'
import { openSessionDb, closeSessionDb, sessionDb } from './sessionDb'
import { createProperty } from './CRUD/registryProperty'
import { listBundles } from './provenance'
import { seedContentIndex } from './indexSeed'
import { queryKeyHolders, queryMentions } from './Database/contentIndex'
import { applyWatchEvents } from './watchPatch'
import { dropLiveTree, refreshTree } from './liveTree'

const A_ID = '01KVGMT8BFP350FZZXAMG1QDRA'
const B_ID = '01KVGMT8BFP350FZZXAMG1QDRB'

let root: string
const deps: MutateDeps = { trashMode: 'nexus', trashToSystem: async () => {} }

const dump = (): unknown => {
  const db = sessionDb()
  if (!db) throw new Error('no session db')
  return {
    mentions: db.prepare('SELECT path, title FROM mentions ORDER BY path, title').all(),
    values: db.prepare('SELECT path, key, value FROM page_values ORDER BY path, key').all(),
  }
}

/** The maintained rows must equal what a from-scratch reconcile derives from the same disk. */
async function expectMaintained(): Promise<void> {
  const maintained = dump()
  const db = sessionDb()
  if (!db) throw new Error('no session db')
  db.exec('DELETE FROM mentions; DELETE FROM page_values; DELETE FROM indexed_files')
  await seedContentIndex(root)
  expect(maintained).toEqual(dump())
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-imaint-'))
  await mkdir(join(root, '.nexus'), { recursive: true })
  await mkdir(join(root, 'Notes', 'Daily'), { recursive: true })
  await writeFile(join(root, '.nexus', 'nexus.json'), JSON.stringify({ id: 'nx', createdAt: 'x' }))
  await writeFile(join(root, '.nexus', 'settings.json'), '{}')
  await writeFile(join(root, 'Notes', '_pagecollection.json'), JSON.stringify({ id: 'c1' }))
  await writeFile(join(root, 'Notes', 'Daily', '_pageset.json'), JSON.stringify({ id: 's1' }))
  await writeFile(
    join(root, 'Notes', 'Daily', 'Alpha.md'),
    `---\nID: ${A_ID}\n---\n\nSee [[Beta]] for more.`,
  )
  await writeFile(join(root, 'Notes', 'Daily', 'Beta.md'), `---\nID: ${B_ID}\n---\n\nbody`)
  await openSession(root)
  openSessionDb(root)
  await seedContentIndex(root)
})
afterEach(async () => {
  dropLiveTree()
  closeSessionDb()
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
    // An un-adopted folder's note updates rows without touching the tree.
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
