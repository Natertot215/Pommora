import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PAGE_ID_KEY } from '@shared/identity'
import { mkdtemp, rm, mkdir, writeFile, readFile, readdir, chmod } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { handleMutate, type MutateDeps } from './mutate'
import { NEW_PAGE_SLOT } from '@shared/mutate'

const A_ID = '01KVGMT8BFG350FZZXAMG1QDRA'
const B_ID = '01KVGMT8BFG350FZZXAMG1QDRB'
const G_ID = '01KVGMT8BFG350FZZXAMG1QDRG'
import { openSession, closeSession } from './session'
import { splitFrontmatter, readNexus } from './readNexus'
import { pathExists } from './io/atomicWrite'
import { createProperty } from './crud/registryProperty'

let root: string
const nexusDeps: MutateDeps = { trashMode: 'nexus', trashToSystem: async () => {} }

const read = async (rel: string): Promise<string> => readFile(join(root, rel), 'utf8')

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'pom-mutate-'))
  await mkdir(join(root, '.nexus'), { recursive: true })
  await mkdir(join(root, 'Notes', 'Daily'), { recursive: true })
  await writeFile(
    join(root, '.nexus', 'nexus.json'),
    JSON.stringify({ id: 'nx', createdAt: '2026' }),
  )
  await writeFile(join(root, '.nexus', 'settings.json'), '{}')
  await writeFile(join(root, 'Notes', '_pagecollection.json'), JSON.stringify({ id: 'pt' }))
  await writeFile(join(root, 'Notes', 'Daily', '_pageset.json'), JSON.stringify({ id: 'col' }))
  await writeFile(
    join(root, 'Notes', 'Daily', 'Alpha.md'),
    '---\nPageID: 01KVGMT8BFG350FZZXAMG1QDRA\n(Areas):\n  - Work\n---\n\nSee [[Beta]] for more.',
  )
  await writeFile(join(root, 'Notes', 'Daily', 'Beta.md'), '---\nPageID: 01KVGMT8BFG350FZZXAMG1QDRB\n---\n\nbody')
  await openSession(root)
})
afterEach(async () => {
  closeSession()
  await rm(root, { recursive: true, force: true })
})

describe('handleMutate — create', () => {
  it('createPage writes a .md in the resolved container + returns its relative path', async () => {
    const r = await handleMutate(
      { op: 'createPage', parentPath: 'Notes/Daily', name: 'New' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.created?.path).toBe('Notes/Daily/New.md')
    expect(await pathExists(join(root, 'Notes/Daily/New.md'))).toBe(true)
  })

  it('createContainer makes a set folder + sidecar', async () => {
    const r = await handleMutate(
      { op: 'createContainer', parentPath: 'Notes', kind: 'set', name: 'Weekly' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.created?.path).toBe('Notes/Weekly')
    expect(await pathExists(join(root, 'Notes/Weekly/_pageset.json'))).toBe(true)
  })

  it('disambiguates a colliding create name (Untitled → Untitled 2)', async () => {
    const first = await handleMutate(
      { op: 'createPage', parentPath: 'Notes/Daily', name: 'Untitled' },
      nexusDeps,
    )
    const second = await handleMutate(
      { op: 'createPage', parentPath: 'Notes/Daily', name: 'Untitled' },
      nexusDeps,
    )
    expect(first.ok && first.value.created?.path).toBe('Notes/Daily/Untitled.md')
    expect(second.ok && second.value.created?.path).toBe('Notes/Daily/Untitled 2.md')
    expect(await pathExists(join(root, 'Notes/Daily/Untitled 2.md'))).toBe(true)
  })

  it('createPage seeds stamp in the birth write; a dead-property seed drops; a blank seed writes no key', async () => {
    await createProperty(root, { id: 'prop_stage', name: 'Stage', type: 'select' })
    const r = await handleMutate(
      {
        op: 'createPage',
        parentPath: 'Notes/Daily',
        name: 'Seeded',
        seeds: {
          prop_stage: { kind: 'select', value: 'doing' },
          prop_gone: { kind: 'select', value: 'x' },
        },
      },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const fm = splitFrontmatter(await read('Notes/Daily/Seeded.md'))
    expect(fm['<Stage>']).toBe('doing')
    expect(Object.keys(fm).some((k) => k.includes('gone'))).toBe(false)

    const blank = await handleMutate(
      {
        op: 'createPage',
        parentPath: 'Notes/Daily',
        name: 'Blank Seed',
        seeds: { prop_stage: { kind: 'select', value: '' } },
      },
      nexusDeps,
    )
    expect(blank.ok).toBe(true)
    expect('<Stage>' in splitFrontmatter(await read('Notes/Daily/Blank Seed.md'))).toBe(false)
  })

  it('createPage order substitutes NEW_PAGE_SLOT with the minted id and persists page_order', async () => {
    const r = await handleMutate(
      {
        op: 'createPage',
        parentPath: 'Notes/Daily',
        name: 'Ordered',
        order: [NEW_PAGE_SLOT, A_ID, B_ID],
      },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const sidecar = JSON.parse(await read('Notes/Daily/_pageset.json')) as {
      page_order?: string[]
    }
    expect(sidecar.page_order).toEqual([r.value.created?.id, A_ID, B_ID])
    // The read path applies it: Ordered resolves first, ahead of Alpha and Beta.
    const tree = await readNexus(root)
    const daily = tree.collections
      .flatMap((c) => c.sets)
      .find((s) => s.path === 'Notes/Daily')
    expect(daily?.pages.map((p) => p.title).slice(0, 3)).toEqual(['Ordered', 'Alpha', 'Beta'])
  })
})

describe('handleMutate — rename', () => {
  it('page rename renames the file AND cascades inbound [[links]], reporting the landed name', async () => {
    const r = await handleMutate(
      { op: 'rename', path: 'Notes/Daily/Beta.md', kind: 'page', newName: 'Gamma' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.renamed).toEqual({ path: 'Notes/Daily/Gamma.md', name: 'Gamma' })
    expect(await pathExists(join(root, 'Notes/Daily/Gamma.md'))).toBe(true)
    expect(await pathExists(join(root, 'Notes/Daily/Beta.md'))).toBe(false)
    expect(await read('Notes/Daily/Alpha.md')).toContain('[[Gamma]]')
  })

  it('a fromCreate rename disambiguates a collision instead of rejecting, and reports what landed', async () => {
    await handleMutate(
      { op: 'createPage', parentPath: 'Notes/Daily', name: 'Untitled' },
      nexusDeps,
    )
    const r = await handleMutate(
      {
        op: 'rename',
        path: 'Notes/Daily/Untitled.md',
        kind: 'page',
        newName: 'Beta',
        fromCreate: true,
      },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.renamed).toEqual({ path: 'Notes/Daily/Beta 2.md', name: 'Beta 2' })
    expect(await pathExists(join(root, 'Notes/Daily/Beta 2.md'))).toBe(true)
    expect(await pathExists(join(root, 'Notes/Daily/Beta.md'))).toBe(true)
  })

  it('a fromCreate rename skips the link cascade — inbound [[links]] to the old title stay put', async () => {
    // Alpha links [[Beta]]; a from-create rename of Beta must NOT rewrite it (an ordinary
    // rename does — the test above goes red if the skip were unconditional).
    const r = await handleMutate(
      {
        op: 'rename',
        path: 'Notes/Daily/Beta.md',
        kind: 'page',
        newName: 'Delta',
        fromCreate: true,
      },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(await pathExists(join(root, 'Notes/Daily/Delta.md'))).toBe(true)
    expect(await read('Notes/Daily/Alpha.md')).toContain('[[Beta]]')
  })

  it('container rename renames the folder (no cascade)', async () => {
    const r = await handleMutate(
      { op: 'rename', path: 'Notes/Daily', kind: 'set', newName: 'Journal' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(await pathExists(join(root, 'Notes/Journal/_pageset.json'))).toBe(true)
    expect(await pathExists(join(root, 'Notes/Daily'))).toBe(false)
  })

  it('rejects a duplicate name', async () => {
    const r = await handleMutate(
      { op: 'rename', path: 'Notes/Daily/Beta.md', kind: 'page', newName: 'Alpha' },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.code).toBe('exists')
  })
})

describe('handleMutate — delete', () => {
  it('nexus mode moves a page into .trash under the folders it was deleted from', async () => {
    const r = await handleMutate(
      { op: 'delete', path: 'Notes/Daily/Beta.md', kind: 'page' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(await pathExists(join(root, 'Notes/Daily/Beta.md'))).toBe(false)
    // .trash mirrors the nexus, so a deleted page shows where it lived; the stamped leaf is a
    // bundle folder, and the artifact sits inside it under the name it always had.
    const trashed = await readdir(join(root, '.trash', 'Notes', 'Daily'))
    const bundle = trashed.find((f) => f.endsWith('__Beta.md.deleted'))
    expect(bundle).toBeDefined()
    expect(await readdir(join(root, '.trash', 'Notes', 'Daily', bundle ?? ''))).toContain('Beta.md')
  })

  it('system mode delegates to the injected OS-trash fn (not the .trash)', async () => {
    const trashToSystem = vi.fn(async (_p: string) => {})
    const r = await handleMutate(
      { op: 'delete', path: 'Notes/Daily/Beta.md', kind: 'page' },
      { trashMode: 'system', trashToSystem },
    )
    expect(r.ok).toBe(true)
    expect(trashToSystem).toHaveBeenCalledOnce()
    expect(trashToSystem.mock.calls[0][0]).toContain('Beta.md')
  })
})

describe('handleMutate — move + guards', () => {
  it('movePage relocates the file to another container', async () => {
    await mkdir(join(root, 'Notes', 'Archive'), { recursive: true })
    await writeFile(join(root, 'Notes', 'Archive', '_pageset.json'), JSON.stringify({ id: 'arc' }))
    const r = await handleMutate(
      { op: 'movePage', path: 'Notes/Daily/Beta.md', newParentPath: 'Notes/Archive' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(await pathExists(join(root, 'Notes/Archive/Beta.md'))).toBe(true)
    expect(await pathExists(join(root, 'Notes/Daily/Beta.md'))).toBe(false)
  })

  it('movePage with order persists the destination page_order (same-parent reorder, no file move)', async () => {
    const r = await handleMutate(
      {
        op: 'movePage',
        path: 'Notes/Daily/Beta.md',
        newParentPath: 'Notes/Daily',
        order: ['b', 'a'],
      },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(await pathExists(join(root, 'Notes/Daily/Beta.md'))).toBe(true)
    expect(JSON.parse(await read('Notes/Daily/_pageset.json')).page_order).toEqual(['b', 'a'])
  })

  it('movePage with order reparents the file AND seeds the destination page_order', async () => {
    const r = await handleMutate(
      { op: 'movePage', path: 'Notes/Daily/Beta.md', newParentPath: 'Notes', order: ['b'] },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(await pathExists(join(root, 'Notes/Beta.md'))).toBe(true)
    expect(await pathExists(join(root, 'Notes/Daily/Beta.md'))).toBe(false)
    expect(JSON.parse(await read('Notes/_pagecollection.json')).page_order).toEqual(['b'])
  })

  it('round-trip: in-set reorder writes page_order to a foreign-keyed sidecar AND readNexus applies it', async () => {
    // Replicate the real on-disk shape: a set sidecar with views and
    // NO page_order, plus a third page.
    await writeFile(
      join(root, 'Notes', 'Daily', '_pageset.json'),
      JSON.stringify({
        id: 'col',
        outside_field: 0,
        modified_at: '2026-05-24T22:00:44Z',
        views: [{ id: 'v1', type: 'table' }],
      }),
    )
    await writeFile(join(root, 'Notes', 'Daily', 'Gamma.md'), '---\nPageID: 01KVGMT8BFG350FZZXAMG1QDRG\n---\n\nbody')
    const r = await handleMutate(
      {
        op: 'movePage',
        path: 'Notes/Daily/Gamma.md',
        newParentPath: 'Notes/Daily',
        order: [G_ID, B_ID, A_ID],
      },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    // page_order written; views preserved (loose sidecar); file not moved
    const sc = JSON.parse(await read('Notes/Daily/_pageset.json'))
    expect(sc.page_order).toEqual([G_ID, B_ID, A_ID])
    expect(sc.views).toHaveLength(1)
    expect(await pathExists(join(root, 'Notes/Daily/Gamma.md'))).toBe(true)
    // readNexus applies it: Daily's pages come back in the persisted order
    const tree = await readNexus(root)
    const daily = tree.collections
      .find((c) => c.title === 'Notes')
      ?.sets.find((s) => s.title === 'Daily')
    expect(daily?.pages.map((p) => p.id)).toEqual([G_ID, B_ID, A_ID])
  })

  it('reorderChildren persists set_order on the collection sidecar', async () => {
    await mkdir(join(root, 'Notes', 'Weekly'), { recursive: true })
    await writeFile(join(root, 'Notes', 'Weekly', '_pageset.json'), JSON.stringify({ id: 'wk' }))
    const r = await handleMutate(
      { op: 'reorderChildren', parentPath: 'Notes', key: 'set_order', order: ['wk', 'col'] },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(JSON.parse(await read('Notes/_pagecollection.json')).set_order).toEqual(['wk', 'col'])
  })

  it('reorderTop persists collection_order to .nexus/state.json', async () => {
    const r = await handleMutate(
      { op: 'reorderTop', key: 'collection_order', order: ['v2', 'v1'] },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(JSON.parse(await read('.nexus/state.json')).collection_order).toEqual(['v2', 'v1'])
  })

  it('moveSet relocates a set folder (with its pages) to another collection AND writes the destination set_order', async () => {
    await mkdir(join(root, 'Notes', 'Daily', 'SetX'), { recursive: true })
    await writeFile(
      join(root, 'Notes', 'Daily', 'SetX', '_pageset.json'),
      JSON.stringify({ id: 'sx' }),
    )
    await writeFile(join(root, 'Notes', 'Daily', 'SetX', 'Inner.md'), '---\nPageID: 01KVGMT8BFG350FZZXAMG1QDRN\n---\n\nbody')
    await mkdir(join(root, 'Notes', 'Weekly'), { recursive: true })
    await writeFile(join(root, 'Notes', 'Weekly', '_pageset.json'), JSON.stringify({ id: 'wk' }))
    const r = await handleMutate(
      { op: 'moveSet', path: 'Notes/Daily/SetX', newParentPath: 'Notes/Weekly', order: ['sx'] },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(await pathExists(join(root, 'Notes/Weekly/SetX/_pageset.json'))).toBe(true) // folder moved
    expect(await pathExists(join(root, 'Notes/Weekly/SetX/Inner.md'))).toBe(true) // its pages travel with it
    expect(await pathExists(join(root, 'Notes/Daily/SetX'))).toBe(false) // gone from the source set
    expect(JSON.parse(await read('Notes/Weekly/_pageset.json')).set_order).toEqual(['sx'])
    const tree = await readNexus(root)
    const weekly = tree.collections
      .find((c) => c.title === 'Notes')
      ?.sets.find((s) => s.title === 'Weekly')
    expect(weekly?.sets?.map((s) => s.id)).toEqual(['sx']) // readNexus reflects the move
  })

  it('moveSet into its current collection is an in-place reorder (no folder move)', async () => {
    await mkdir(join(root, 'Notes', 'Daily', 'SetA'), { recursive: true })
    await mkdir(join(root, 'Notes', 'Daily', 'SetB'), { recursive: true })
    await writeFile(
      join(root, 'Notes', 'Daily', 'SetA', '_pageset.json'),
      JSON.stringify({ id: 'sa' }),
    )
    await writeFile(
      join(root, 'Notes', 'Daily', 'SetB', '_pageset.json'),
      JSON.stringify({ id: 'sb' }),
    )
    const r = await handleMutate(
      {
        op: 'moveSet',
        path: 'Notes/Daily/SetA',
        newParentPath: 'Notes/Daily',
        order: ['sb', 'sa'],
      },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(await pathExists(join(root, 'Notes/Daily/SetA/_pageset.json'))).toBe(true) // stayed put
    expect(JSON.parse(await read('Notes/Daily/_pageset.json')).set_order).toEqual(['sb', 'sa'])
  })

  it('rejects a path that escapes the nexus root', async () => {
    const r = await handleMutate(
      { op: 'rename', path: '../evil', kind: 'page', newName: 'x' },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.code).toBe('invalid-path')
  })

  it('fails when no nexus is open', async () => {
    closeSession()
    const r = await handleMutate({ op: 'createPage', parentPath: 'Notes', name: 'X' }, nexusDeps)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.code).toBe('no-nexus')
    expect(r.error.message).toBe('No nexus is open.')
  })
})

describe('handleMutate — review-round hardening', () => {
  it('creates a collection at the nexus root (parentPath "")', async () => {
    const r = await handleMutate(
      { op: 'createContainer', parentPath: '', kind: 'collection', name: 'Inbox' },
      nexusDeps,
    )
    expect(r.ok && r.value.created?.path).toBe('Inbox')
    expect(await pathExists(join(root, 'Inbox/_pagecollection.json'))).toBe(true)
  })

  it('refuses to delete the .nexus machinery, leaving it intact', async () => {
    const r = await handleMutate({ op: 'delete', path: '.nexus', kind: 'collection' }, nexusDeps)
    expect(r.ok).toBe(false)
    expect(await pathExists(join(root, '.nexus'))).toBe(true)
  })

  it('rejects a name containing a NUL byte as invalid-name (not a throw)', async () => {
    const r = await handleMutate(
      {
        op: 'createPage',
        parentPath: 'Notes/Daily',
        name: `bad${String.fromCharCode(0)}name`,
      },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.code).toBe('invalid-name')
  })

  it('rename to the current name is a no-op success', async () => {
    const r = await handleMutate(
      { op: 'rename', path: 'Notes/Daily/Beta.md', kind: 'page', newName: 'Beta' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(await pathExists(join(root, 'Notes/Daily/Beta.md'))).toBe(true)
  })

  it('delete of an already-gone path returns not-found (no throw)', async () => {
    await handleMutate({ op: 'delete', path: 'Notes/Daily/Beta.md', kind: 'page' }, nexusDeps)
    const again = await handleMutate(
      { op: 'delete', path: 'Notes/Daily/Beta.md', kind: 'page' },
      nexusDeps,
    )
    expect(again.ok).toBe(false)
    if (again.ok) return
    expect(again.error.code).toBe('not-found')
  })

  it('movePage into the current folder is a no-op success; a name collision fails + leaves the source', async () => {
    const noop = await handleMutate(
      { op: 'movePage', path: 'Notes/Daily/Beta.md', newParentPath: 'Notes/Daily' },
      nexusDeps,
    )
    expect(noop.ok).toBe(true)
    expect(await pathExists(join(root, 'Notes/Daily/Beta.md'))).toBe(true)
    await mkdir(join(root, 'Notes', 'Other'), { recursive: true })
    await writeFile(join(root, 'Notes', 'Other', '_pageset.json'), JSON.stringify({ id: 'oth' }))
    await writeFile(join(root, 'Notes', 'Other', 'Beta.md'), '---\nPageID: 01KVGMT8BFG350FZZXAMG1QDRZ\n---\n')
    const clash = await handleMutate(
      { op: 'movePage', path: 'Notes/Daily/Beta.md', newParentPath: 'Notes/Other' },
      nexusDeps,
    )
    expect(clash.ok).toBe(false)
    if (clash.ok) return
    expect(clash.error.code).toBe('exists')
    expect(await pathExists(join(root, 'Notes/Daily/Beta.md'))).toBe(true)
  })

  it('setProfileSubtitle writes settings.profile_subtitle, preserving other settings keys', async () => {
    await writeFile(
      join(root, '.nexus', 'settings.json'),
      JSON.stringify({ version: 1, outside_key: 'blue' }),
    )
    const r = await handleMutate(
      { op: 'setProfileSubtitle', subtitle: 'A second brain.' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const cfg = JSON.parse(await read('.nexus/settings.json'))
    expect(cfg.profile_subtitle).toBe('A second brain.')
    expect(cfg.outside_key).toBe('blue') // foreign keys preserved
    expect(cfg.version).toBe(1)
  })

  it('setProfileSubtitle clamps to 30 chars', async () => {
    await handleMutate({ op: 'setProfileSubtitle', subtitle: 'x'.repeat(50) }, nexusDeps)
    expect(JSON.parse(await read('.nexus/settings.json')).profile_subtitle.length).toBe(30)
  })

  it('setProfileImage copies the image under .nexus/assets/<nexusID>/ and records the path', async () => {
    const r = await handleMutate(
      { op: 'setProfileImage', dataUrl: 'data:image/png;base64,iVBORw0KGgo=' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const cfg = JSON.parse(await read('.nexus/settings.json'))
    expect(cfg.profile_image).toMatch(/^\.nexus\/assets\/nx\/profile-.+\.png$/)
    expect(await pathExists(join(root, cfg.profile_image))).toBe(true)
  })

  it('setProfileImage null clears the field + deletes the file', async () => {
    await handleMutate(
      { op: 'setProfileImage', dataUrl: 'data:image/png;base64,iVBORw0KGgo=' },
      nexusDeps,
    )
    const prevPath = JSON.parse(await read('.nexus/settings.json')).profile_image
    const r = await handleMutate({ op: 'setProfileImage', dataUrl: null }, nexusDeps)
    expect(r.ok).toBe(true)
    expect(JSON.parse(await read('.nexus/settings.json')).profile_image).toBeUndefined()
    expect(await pathExists(join(root, prevPath))).toBe(false)
  })

  it('homepage setBanner preserves blocks/icon/foreign keys (read-merge-write)', async () => {
    await writeFile(
      join(root, '.nexus', 'homepage.json'),
      JSON.stringify({ outside_field: 2, icon: 'house', blocks: [{ t: 'x' }] }),
    )
    const r = await handleMutate(
      {
        op: 'setBanner',
        kind: 'homepage',
        path: '',
        dataUrl: 'data:image/png;base64,iVBORw0KGgo=',
      },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const cfg = JSON.parse(await read('.nexus/homepage.json'))
    expect(cfg.banner).toMatch(/^\.nexus\/assets\/homepage\/banner-.+\.png$/)
    expect(cfg.blocks).toEqual([{ t: 'x' }]) // foreign blocks round-trip untouched
    expect(cfg.icon).toBe('house')
    expect(cfg.outside_field).toBe(2)
  })

  it('navview setBanner writes + clears the navigation.json banner, never homepage.json', async () => {
    const r = await handleMutate(
      { op: 'setBanner', kind: 'navview', path: '', dataUrl: 'data:image/png;base64,iVBORw0KGgo=' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const cfg = JSON.parse(await read('.nexus/navigation.json'))
    expect(cfg.banner).toMatch(/^\.nexus\/assets\/banner-.+\.png$/)
    const clear = await handleMutate(
      { op: 'setBanner', kind: 'navview', path: '', dataUrl: null },
      nexusDeps,
    )
    expect(clear.ok).toBe(true)
    expect(JSON.parse(await read('.nexus/navigation.json')).banner).toBeUndefined()
  })

  it('a malformed op returns a clean fault, not a throw', async () => {
    const bogus = { op: 'bogus' } as unknown as Parameters<typeof handleMutate>[0]
    const r = await handleMutate(bogus, nexusDeps)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.error.code).toBe('operation-failed')
  })

  it('reverts the page rename when the link cascade fails', async () => {
    // A page linking [[Beta]] in a read-only dir → the cascade's rewrite commit throws.
    await mkdir(join(root, 'Notes', 'Locked'), { recursive: true })
    await writeFile(join(root, 'Notes', 'Locked', '_pageset.json'), JSON.stringify({ id: 'lk' }))
    await writeFile(
      join(root, 'Notes', 'Locked', 'Linker.md'),
      '---\nPageID: 01KVGMT8BFG350FZZXAMG1QDRK\n---\n\nSee [[Beta]].',
    )
    await chmod(join(root, 'Notes', 'Locked'), 0o555)
    try {
      const r = await handleMutate(
        { op: 'rename', path: 'Notes/Daily/Beta.md', kind: 'page', newName: 'Gamma' },
        nexusDeps,
      )
      expect(r.ok).toBe(false)
      expect(await pathExists(join(root, 'Notes/Daily/Beta.md'))).toBe(true) // reverted
      expect(await pathExists(join(root, 'Notes/Daily/Gamma.md'))).toBe(false)
    } finally {
      await chmod(join(root, 'Notes', 'Locked'), 0o755) // restore so afterEach cleanup works
    }
  })
})

describe('handleMutate — setBanner', () => {
  const PNG =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

  it('writes a fresh-named asset under .nexus/assets/<id>/ + records it on the collection sidecar (foreign keys kept)', async () => {
    const r = await handleMutate(
      { op: 'setBanner', path: 'Notes', kind: 'collection', dataUrl: PNG },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const sc = JSON.parse(await read('Notes/_pagecollection.json'))
    expect(sc.banner).toMatch(/^\.nexus\/assets\/pt\/banner-[a-z0-9]+\.png$/)
    expect(await pathExists(join(root, sc.banner))).toBe(true)
    expect(sc.id).toBe('pt') // existing keys untouched
  })

  it('sets a banner on a set sidecar, keyed by the set id', async () => {
    const r = await handleMutate(
      { op: 'setBanner', path: 'Notes/Daily', kind: 'set', dataUrl: PNG },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const sc = JSON.parse(await read('Notes/Daily/_pageset.json'))
    expect(sc.banner).toMatch(/^\.nexus\/assets\/col\/banner-[a-z0-9]+\.png$/)
    expect(await pathExists(join(root, sc.banner))).toBe(true)
  })

  it('readNexus surfaces the banner path on collection + context + set nodes', async () => {
    await handleMutate(
      { op: 'setBanner', path: 'Notes', kind: 'collection', dataUrl: PNG },
      nexusDeps,
    )
    await handleMutate(
      { op: 'setBanner', path: 'Notes/Daily', kind: 'set', dataUrl: PNG },
      nexusDeps,
    )
    const tree = await readNexus(root)
    expect(tree.collections.find((c) => c.id === 'pt')?.banner).toMatch(
      /^\.nexus\/assets\/pt\/banner-/,
    )
    expect(
      tree.collections.find((c) => c.id === 'pt')?.sets.find((s) => s.id === 'col')?.banner,
    ).toMatch(/^\.nexus\/assets\/col\/banner-/)
  })

  it('clearing (dataUrl null) removes the field and deletes the file', async () => {
    await handleMutate(
      { op: 'setBanner', path: 'Notes', kind: 'collection', dataUrl: PNG },
      nexusDeps,
    )
    const file = JSON.parse(await read('Notes/_pagecollection.json')).banner
    const r = await handleMutate(
      { op: 'setBanner', path: 'Notes', kind: 'collection', dataUrl: null },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(await pathExists(join(root, file))).toBe(false)
    expect(JSON.parse(await read('Notes/_pagecollection.json')).banner).toBeUndefined()
  })

  it('replacing yields a NEW filename (cache-bust) and deletes the prior file', async () => {
    await handleMutate(
      { op: 'setBanner', path: 'Notes', kind: 'collection', dataUrl: PNG },
      nexusDeps,
    )
    const first = JSON.parse(await read('Notes/_pagecollection.json')).banner
    await handleMutate(
      { op: 'setBanner', path: 'Notes', kind: 'collection', dataUrl: PNG },
      nexusDeps,
    )
    const second = JSON.parse(await read('Notes/_pagecollection.json')).banner
    expect(second).not.toBe(first) // distinct URL so the renderer refetches the new image
    expect(await pathExists(join(root, first))).toBe(false) // prior deleted
    expect(await pathExists(join(root, second))).toBe(true)
  })

  it('sets a page banner as the `cover` frontmatter key, asset keyed by page id; clearing reverts', async () => {
    const created = await handleMutate(
      { op: 'createPage', parentPath: 'Notes/Daily', name: 'Cover' },
      nexusDeps,
    )
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const pagePath = created.value.created!.path
    const r = await handleMutate(
      { op: 'setBanner', path: pagePath, kind: 'page', dataUrl: PNG },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const after = await read(pagePath)
    const id = new RegExp(`${PAGE_ID_KEY}:\\s*(\\S+)`).exec(after)?.[1]
    const cover = /cover:\s*(\S+)/.exec(after)?.[1]
    expect(cover).toBe(`.nexus/assets/${id}/${cover?.split('/').pop()}`)
    expect(cover).toMatch(/banner-[a-z0-9]+\.png$/)
    expect(await pathExists(join(root, cover!))).toBe(true)
    // clearing removes the cover key + deletes the asset
    const cleared = await handleMutate(
      { op: 'setBanner', path: pagePath, kind: 'page', dataUrl: null },
      nexusDeps,
    )
    expect(cleared.ok).toBe(true)
    expect(await read(pagePath)).not.toMatch(/cover:/)
    expect(await pathExists(join(root, cover!))).toBe(false)
  })

  // An id read off disk is hand-editable, and it becomes a directory name under `.nexus/assets/`.
  // A page carrying path syntax in its id must refuse rather than let `join` write outside the
  // nexus — and the refusal must leave the page itself untouched.
  it('refuses a page id that would escape the assets folder, writing nothing', async () => {
    const created = await handleMutate(
      { op: 'createPage', parentPath: 'Notes/Daily', name: 'Escape' },
      nexusDeps,
    )
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const pagePath = created.value.created!.path
    const abs = join(root, pagePath)
    await writeFile(abs, '---\nPageID: ../../../../escaped\n---\nbody')
    const before = await read(pagePath)

    const r = await handleMutate(
      { op: 'setBanner', path: pagePath, kind: 'page', dataUrl: PNG },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
    expect(await read(pagePath)).toBe(before)
    expect(await pathExists(join(root, '..', 'escaped'))).toBe(false)
  })

  it('sets a homepage banner in .nexus/homepage.json keyed by "homepage"', async () => {
    const r = await handleMutate(
      { op: 'setBanner', path: '', kind: 'homepage', dataUrl: PNG },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const sc = JSON.parse(await read('.nexus/homepage.json'))
    expect(sc.banner).toMatch(/^\.nexus\/assets\/homepage\/banner-[a-z0-9]+\.png$/)
    expect(await pathExists(join(root, sc.banner))).toBe(true)
    const tree = await readNexus(root)
    expect(tree.homepage.banner).toBe(sc.banner)
  })
})

describe('handleMutate — setProperty (the D-4 cross-group reassignment write)', () => {
  // A value only writes for a property the registry knows — the key carries a name, and an
  // unknown name is inert by construction.
  beforeEach(async () => {
    await createProperty(root, { id: 'prop_s', name: 'Stage', type: 'select' })
    await createProperty(root, { id: 'prop_m', name: 'Tags', type: 'multi_select' })
  })

  it('writes a typed property into the page frontmatter, preserving id + body', async () => {
    const r = await handleMutate(
      {
        op: 'setProperty',
        path: 'Notes/Daily/Beta.md',
        propertyId: 'prop_s',
        value: { kind: 'select', value: 'done' },
      },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const md = await read('Notes/Daily/Beta.md')
    expect(md).toContain('body')
    expect(splitFrontmatter(md)[PAGE_ID_KEY]).toBe(B_ID)
    expect(splitFrontmatter(md)['<Stage>']).toBe('done')
  })

  it('stamps modified_at — a property VALUE change is an edit', async () => {
    await handleMutate(
      {
        op: 'setProperty',
        path: 'Notes/Daily/Beta.md',
        propertyId: 'prop_s',
        value: { kind: 'select', value: 'done' },
      },
      nexusDeps,
    )
    const stamp = splitFrontmatter(await read('Notes/Daily/Beta.md')).modified_at
    expect(typeof stamp).toBe('string')
    expect(stamp as string).toBeTruthy()
  })

  it('a null value clears the property key', async () => {
    await handleMutate(
      {
        op: 'setProperty',
        path: 'Notes/Daily/Beta.md',
        propertyId: 'prop_s',
        value: { kind: 'select', value: 'done' },
      },
      nexusDeps,
    )
    const r = await handleMutate(
      { op: 'setProperty', path: 'Notes/Daily/Beta.md', propertyId: 'prop_s', value: null },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(splitFrontmatter(await read('Notes/Daily/Beta.md'))['<Stage>']).toBeUndefined()
  })

  it('an emptied value clears the key on disk — the file never holds a [] placeholder', async () => {
    await handleMutate(
      {
        op: 'setProperty',
        path: 'Notes/Daily/Beta.md',
        propertyId: 'prop_m',
        value: { kind: 'multiSelect', value: ['a'] },
      },
      nexusDeps,
    )
    const r = await handleMutate(
      {
        op: 'setProperty',
        path: 'Notes/Daily/Beta.md',
        propertyId: 'prop_m',
        value: { kind: 'multiSelect', value: [] },
      },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const md = await read('Notes/Daily/Beta.md')
    expect(splitFrontmatter(md)['<Tags>']).toBeUndefined()
    expect(md).not.toContain('<Tags>')
  })

  it('never throws on a missing page — returns ok:false', async () => {
    const r = await handleMutate(
      { op: 'setProperty', path: 'Notes/Daily/Ghost.md', propertyId: 'prop_s', value: null },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
  })
})

describe('handleMutate — setIcon and setHeadingIconHidden on a container sidecar', () => {
  it('sets an icon and drops the key again when it is cleared, keeping foreign keys', async () => {
    const set = await handleMutate(
      { op: 'setIcon', path: 'Notes', kind: 'collection', icon: 'star' },
      nexusDeps,
    )
    expect(set.ok).toBe(true)
    let sc = JSON.parse(await read('Notes/_pagecollection.json'))
    expect(sc.icon).toBe('star')
    expect(sc.id).toBe('pt')

    const cleared = await handleMutate(
      { op: 'setIcon', path: 'Notes', kind: 'collection', icon: null },
      nexusDeps,
    )
    expect(cleared.ok).toBe(true)
    sc = JSON.parse(await read('Notes/_pagecollection.json'))
    expect('icon' in sc).toBe(false)
    expect(sc.id).toBe('pt')
  })

  it('refuses an icon on a sidecar with no id rather than reseeding one', async () => {
    await writeFile(join(root, 'Notes/_pagecollection.json'), JSON.stringify({ views: [] }))
    const r = await handleMutate(
      { op: 'setIcon', path: 'Notes', kind: 'collection', icon: 'star' },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
  })

  it('round-trips the heading-icon flag, and absence is the shown default', async () => {
    const hidden = await handleMutate(
      { op: 'setHeadingIconHidden', path: 'Notes', kind: 'collection', hidden: true },
      nexusDeps,
    )
    expect(hidden.ok).toBe(true)
    expect(JSON.parse(await read('Notes/_pagecollection.json')).heading_icon_hidden).toBe(true)

    const shown = await handleMutate(
      { op: 'setHeadingIconHidden', path: 'Notes', kind: 'collection', hidden: false },
      nexusDeps,
    )
    expect(shown.ok).toBe(true)
    const sc = JSON.parse(await read('Notes/_pagecollection.json'))
    expect('heading_icon_hidden' in sc).toBe(false)
    expect(sc.id).toBe('pt')
  })
})
