import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { PAGE_ID_KEY } from '@shared/identity'
import { mkdtemp, rm, mkdir, writeFile, readFile, readdir, chmod, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { adoptFile, handleMutate, type MutateDeps } from './mutate'
import { NEW_PAGE_SLOT } from '@shared/mutate'
import type { Crop } from '@shared/schemas'
import { cropKeyFor } from '@shared/nexusPaths'
import { assetFilePath } from './assetRoots'

const A_ID = '01KVGMT8BFG350FZZXAMG1QDRA'
const B_ID = '01KVGMT8BFG350FZZXAMG1QDRB'
const G_ID = '01KVGMT8BFG350FZZXAMG1QDRG'
import { openSession, closeSession, sessionRoot } from './session'
import { flushValueWrites } from './valuesChanged'
import { splitFrontmatter, readNexus } from './readNexus'
import { pathExists } from './IO/atomicWrite'
import { createProperty } from './CRUD/registryProperty'
import { liveAssetMap, resolveAssetName, takeAssetMapPush } from './assetMap'

let root: string
const nexusDeps: MutateDeps = { trashMode: 'nexus', trashToSystem: (p) => rm(p, { force: true }) }

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
    '---\nPageID: 01KVGMT8BFG350FZZXAMG1QDRA\n<Areas>:\n  - Work\n---\n\nSee [[Beta]] for more.',
  )
  await writeFile(
    join(root, 'Notes', 'Daily', 'Beta.md'),
    '---\nPageID: 01KVGMT8BFG350FZZXAMG1QDRB\n---\n\nbody',
  )
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

  it('createPage writes its seeds in the birth write; a dead-property seed drops; a blank seed writes no key', async () => {
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
    expect(fm.Stage).toEqual(['doing'])
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
    expect('Stage' in splitFrontmatter(await read('Notes/Daily/Blank Seed.md'))).toBe(false)
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
    const tree = await readNexus(root)
    const daily = tree.collections.flatMap((c) => c.sets).find((s) => s.path === 'Notes/Daily')
    expect(daily?.pages.map((p) => p.title).slice(0, 3)).toEqual(['Ordered', 'Alpha', 'Beta'])
  })

  it('createPage notes the new page for the values push', async () => {
    const live = sessionRoot()!
    flushValueWrites(live)
    const r = await handleMutate(
      { op: 'createPage', parentPath: 'Notes/Daily', name: 'Noted' },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(flushValueWrites(live).map((c) => c.rel)).toEqual(['Notes/Daily'])
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
    await handleMutate({ op: 'createPage', parentPath: 'Notes/Daily', name: 'Untitled' }, nexusDeps)
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
        views: [{ id: 'v1', type: 'table' }],
      }),
    )
    await writeFile(
      join(root, 'Notes', 'Daily', 'Gamma.md'),
      '---\nPageID: 01KVGMT8BFG350FZZXAMG1QDRG\n---\n\nbody',
    )
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
    await writeFile(
      join(root, 'Notes', 'Daily', 'SetX', 'Inner.md'),
      '---\nPageID: 01KVGMT8BFG350FZZXAMG1QDRN\n---\n\nbody',
    )
    await mkdir(join(root, 'Notes', 'Weekly'), { recursive: true })
    await writeFile(join(root, 'Notes', 'Weekly', '_pageset.json'), JSON.stringify({ id: 'wk' }))
    const r = await handleMutate(
      { op: 'moveSet', path: 'Notes/Daily/SetX', newParentPath: 'Notes/Weekly', order: ['sx'] },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(await pathExists(join(root, 'Notes/Weekly/SetX/_pageset.json'))).toBe(true)
    expect(await pathExists(join(root, 'Notes/Weekly/SetX/Inner.md'))).toBe(true)
    expect(await pathExists(join(root, 'Notes/Daily/SetX'))).toBe(false)
    expect(JSON.parse(await read('Notes/Weekly/_pageset.json')).set_order).toEqual(['sx'])
    const tree = await readNexus(root)
    const weekly = tree.collections
      .find((c) => c.title === 'Notes')
      ?.sets.find((s) => s.title === 'Weekly')
    expect(weekly?.sets?.map((s) => s.id)).toEqual(['sx'])
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
    expect(await pathExists(join(root, 'Notes/Daily/SetA/_pageset.json'))).toBe(true)
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
    await writeFile(
      join(root, 'Notes', 'Other', 'Beta.md'),
      '---\nPageID: 01KVGMT8BFG350FZZXAMG1QDRZ\n---\n',
    )
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

  const pickImage = async (name: string, body = 'img-bytes'): Promise<string> => {
    await mkdir(join(root, '_picks'), { recursive: true })
    const p = join(root, '_picks', name)
    await writeFile(p, body)
    return p
  }

  it('adopts a picked image under the asset root and names it by wikilink', async () => {
    const r = await handleMutate(
      { op: 'setProfileImage', source: await pickImage('Photo.png') },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(JSON.parse(await read('.nexus/settings.json')).profile_image).toBe('[[Photo.png]]')
    expect(await pathExists(join(root, '.nexus/assets/Photo.png'))).toBe(true)
  })

  it('a replaced photo under .nexus/assets is deleted; one under the configured root is not', async () => {
    // default root (.nexus/assets): Pommora's own, so a replacement cleans it up
    await handleMutate({ op: 'setProfileImage', source: await pickImage('First.png') }, nexusDeps)
    await handleMutate({ op: 'setProfileImage', source: await pickImage('Second.png') }, nexusDeps)
    expect(await pathExists(join(root, '.nexus/assets/First.png'))).toBe(false)
    // configured root (file-assets): shared, so a replaced file survives
    await writeFile(
      join(root, '.nexus', 'settings.json'),
      JSON.stringify({ asset_directory: 'file-assets' }),
    )
    await mkdir(join(root, 'file-assets'), { recursive: true })
    await handleMutate({ op: 'setProfileImage', source: await pickImage('Kept.png') }, nexusDeps)
    await handleMutate({ op: 'setProfileImage', source: await pickImage('Next.png') }, nexusDeps)
    expect(await pathExists(join(root, 'file-assets/Kept.png'))).toBe(true)
  })

  it('setProfileImage null clears the field and deletes what Pommora minted', async () => {
    await handleMutate({ op: 'setProfileImage', source: await pickImage('Gone.png') }, nexusDeps)
    const r = await handleMutate({ op: 'setProfileImage', source: null }, nexusDeps)
    expect(r.ok).toBe(true)
    expect(JSON.parse(await read('.nexus/settings.json')).profile_image).toBeUndefined()
    expect(await pathExists(join(root, '.nexus/assets/Gone.png'))).toBe(false)
  })

  it('a non-image source is refused, writing nothing', async () => {
    const r = await handleMutate(
      { op: 'setProfileImage', source: await pickImage('Notes.txt') },
      nexusDeps,
    )
    expect(r.ok).toBe(false)
    expect(JSON.parse(await read('.nexus/settings.json')).profile_image).toBeUndefined()
  })

  it('adopts a real local image source the renderer named (no picked-path gate)', async () => {
    const r = await handleMutate(
      { op: 'setProfileImage', source: await pickImage('Real.png') },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(JSON.parse(await read('.nexus/settings.json')).profile_image).toBe('[[Real.png]]')
  })

  it('stores an http(s) source by reference', async () => {
    const url = 'https://example.com/photo.png'
    const r = await handleMutate({ op: 'setProfileImage', source: url }, nexusDeps)
    expect(r.ok).toBe(true)
    expect(JSON.parse(await read('.nexus/settings.json')).profile_image).toBe(url)
  })

  it('a source that resolves to no image faults and leaves the prior photo untouched', async () => {
    await handleMutate({ op: 'setProfileImage', source: await pickImage('First.png') }, nexusDeps)
    expect(JSON.parse(await read('.nexus/settings.json')).profile_image).toBe('[[First.png]]')
    // A file: URL — like any non-image string — dies in adoptFile with no extension it can show.
    const r = await handleMutate({ op: 'setProfileImage', source: 'file:///etc/passwd' }, nexusDeps)
    expect(r.ok).toBe(false)
    expect(JSON.parse(await read('.nexus/settings.json')).profile_image).toBe('[[First.png]]')
  })

  it('a replaced photo asset moves to the trash, not a hard delete', async () => {
    const trashToSystem = vi.fn(async (_p: string) => {})
    const deps: MutateDeps = { trashMode: 'system', trashToSystem }
    await handleMutate({ op: 'setProfileImage', source: await pickImage('Old.png') }, deps)
    await handleMutate({ op: 'setProfileImage', source: await pickImage('New.png') }, deps)
    expect(trashToSystem).toHaveBeenCalledOnce()
    expect(trashToSystem.mock.calls[0][0]).toContain('Old.png')
  })

  it('homepage setBanner preserves blocks/icon/foreign keys (read-merge-write)', async () => {
    await writeFile(
      join(root, '.nexus', 'homepage.json'),
      JSON.stringify({ outside_field: 2, icon: 'house', blocks: [{ t: 'x' }] }),
    )
    const src = join(root, 'Pick.png')
    await writeFile(src, 'bytes')
    const r = await handleMutate(
      { op: 'setBanner', kind: 'homepage', path: '', source: src },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    const cfg = JSON.parse(await read('.nexus/homepage.json'))
    expect(cfg.banner).toBe('[[Pick.png]]')
    expect(cfg.blocks).toEqual([{ t: 'x' }]) // foreign blocks round-trip untouched
    expect(cfg.icon).toBe('house')
    expect(cfg.outside_field).toBe(2)
  })

  it('navview setBanner writes + clears the navigation.json banner, never homepage.json', async () => {
    const src = join(root, 'Nav.png')
    await writeFile(src, 'bytes')
    const r = await handleMutate(
      { op: 'setBanner', kind: 'navview', path: '', source: src },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(JSON.parse(await read('.nexus/navigation.json')).banner).toBe('[[Nav.png]]')
    const clear = await handleMutate(
      { op: 'setBanner', kind: 'navview', path: '', source: null },
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
  let outside: string
  beforeEach(async () => {
    outside = await mkdtemp(join(tmpdir(), 'pom-pick-'))
  })
  afterEach(async () => {
    await rm(outside, { recursive: true, force: true })
  })

  const pick = async (name: string, body = 'image-bytes'): Promise<string> => {
    const p = join(outside, name)
    await writeFile(p, body)
    return p
  }
  /** Point the nexus at a shared asset folder and seed it, the way an Obsidian vault arrives. */
  const withAssetDir = async (files: string[][] = []): Promise<string> => {
    await writeFile(
      join(root, '.nexus', 'settings.json'),
      JSON.stringify({ asset_directory: 'file-assets' }),
    )
    const assets = join(root, 'file-assets')
    await mkdir(assets, { recursive: true })
    for (const segs of files) {
      await mkdir(join(assets, ...segs.slice(0, -1)), { recursive: true })
      await writeFile(join(assets, ...segs), 'held-bytes')
    }
    return assets
  }
  const bannerOf = async (): Promise<string> =>
    JSON.parse(await read('Notes/_pagecollection.json')).banner
  const setBanner = (source: string | null) =>
    handleMutate({ op: 'setBanner', path: 'Notes', kind: 'collection', source }, nexusDeps)

  it('adopts a picked file under its own name and names it by wikilink', async () => {
    const assets = await withAssetDir()
    const r = await setBanner(await pick('Sunset.png'))
    expect(r.ok).toBe(true)
    expect(await bannerOf()).toBe('[[Sunset.png]]')
    expect(await pathExists(join(assets, 'Sunset.png'))).toBe(true)
    expect(JSON.parse(await read('Notes/_pagecollection.json')).id).toBe('pt') // keys untouched
  })

  it('a file already inside the asset root is referenced, never copied', async () => {
    const assets = await withAssetDir([['Held.png']])
    const r = await setBanner(join(assets, 'Held.png'))
    expect(r.ok).toBe(true)
    expect(await bannerOf()).toBe('[[Held.png]]')
    expect(await readdir(assets)).toEqual(['Held.png'])
  })

  it('a name several files inside the asset root answer to is refused, writing nothing', async () => {
    // Referencing it would spell exactly what the resolver refuses to answer.
    const assets = await withAssetDir([
      ['a', 'Twin.png'],
      ['b', 'Twin.png'],
    ])
    const r = await setBanner(join(assets, 'a', 'Twin.png'))
    expect(r.ok).toBe(false)
    expect(await bannerOf()).toBeUndefined()
  })

  it('a basename colliding with a DIFFERENT file steps aside rather than overwriting it', async () => {
    const assets = await withAssetDir([['Sunset.png']])
    const r = await setBanner(await pick('Sunset.png', 'picked-bytes'))
    expect(r.ok).toBe(true)
    expect(await bannerOf()).toBe('[[Sunset 2.png]]')
    expect(await readFile(join(assets, 'Sunset.png'), 'utf8')).toBe('held-bytes')
    expect(await readFile(join(assets, 'Sunset 2.png'), 'utf8')).toBe('picked-bytes')
  })

  it('a basename colliding with BYTE-IDENTICAL content is referenced, not copied twice', async () => {
    const assets = await withAssetDir([['Same.png']])
    const r = await setBanner(await pick('Same.png', 'held-bytes'))
    expect(r.ok).toBe(true)
    expect(await bannerOf()).toBe('[[Same.png]]')
    expect(await readdir(assets)).toEqual(['Same.png'])
  })

  it('a name no wikilink can spell is refused', async () => {
    // `[[…]]` carries no escape for a `]`, so the reference has no spelling at all.
    await withAssetDir()
    const r = await setBanner(await pick('Bad]Name.png'))
    expect(r.ok).toBe(false)
    expect(await bannerOf()).toBeUndefined()
  })

  it('a name held ANYWHERE under the root steps aside, not just one in the same folder', async () => {
    // A basename answers nexus-wide, so landing a second `Sunset.png` at the root would make the
    // stored link ambiguous — the very reference adoption refuses to author.
    const assets = await withAssetDir([['sub', 'Sunset.png']])
    const r = await setBanner(await pick('Sunset.png', 'picked-bytes'))
    expect(r.ok).toBe(true)
    expect(await bannerOf()).toBe('[[Sunset 2.png]]')
    expect(await pathExists(join(assets, 'Sunset 2.png'))).toBe(true)
  })

  it('a file that is not an image Pommora can show is refused', async () => {
    await withAssetDir()
    const r = await setBanner(await pick('Notes.txt'))
    expect(r.ok).toBe(false)
    expect(await bannerOf()).toBeUndefined()
  })

  it('a name carrying an alias separator is refused', async () => {
    // `[[Sun|set.png]]` reads as title `Sun` with alias `set.png` — a link that means nothing.
    await withAssetDir()
    const r = await setBanner(await pick('Sun|set.png'))
    expect(r.ok).toBe(false)
    expect(await bannerOf()).toBeUndefined()
  })

  it('a dot-prefixed name the map would never hold is refused', async () => {
    await withAssetDir()
    const r = await setBanner(await pick('.hidden.png'))
    expect(r.ok).toBe(false)
    expect(await bannerOf()).toBeUndefined()
  })

  it('an unreadable source fails and leaves the store untouched', async () => {
    await withAssetDir()
    const r = await setBanner(join(outside, 'Missing.png'))
    expect(r.ok).toBe(false)
    expect(await bannerOf()).toBeUndefined()
  })

  // The defect this shape exists to catch: `atomicWriteBinary` records its own write and the
  // watcher drops the echo, so a test that rebuilds the map from the directory passes while the
  // app renders blank. The adopted value must resolve against the map main is HOLDING.
  it('the adopted value resolves against the map main holds, and that map is owed a push', async () => {
    await withAssetDir()
    await liveAssetMap(root) // the map as the running app holds it, before the write
    const r = await setBanner(await pick('Live.png'))
    expect(r.ok).toBe(true)
    const pushed = takeAssetMapPush(sessionRoot()!)
    expect(pushed).not.toBeNull()
    expect(resolveAssetName(pushed!, 'Live.png')).toBe('file-assets/Live.png')
  })

  it("a replaced banner in the user's own asset folder is never deleted", async () => {
    // The folder is shared — a file there may be referenced from an Obsidian note this app cannot
    // see, and nothing on this path is trashed. Replacing a banner is not consent to destroy it.
    const assets = await withAssetDir([['Solo.png']])
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'pt', banner: '[[Solo.png]]' }),
    )
    expect((await setBanner(await pick('Next.png'))).ok).toBe(true)
    expect(await pathExists(join(assets, 'Solo.png'))).toBe(true)
  })

  it('a replaced banner several files answer to deletes none of them', async () => {
    // Rendering the wrong image is recoverable; deleting one is not.
    const assets = await withAssetDir([
      ['a', 'Twin.png'],
      ['b', 'Twin.png'],
    ])
    await writeFile(
      join(root, 'Notes', '_pagecollection.json'),
      JSON.stringify({ id: 'pt', banner: '[[Twin.png]]' }),
    )
    expect((await setBanner(await pick('Next.png'))).ok).toBe(true)
    expect(await pathExists(join(assets, 'a', 'Twin.png'))).toBe(true)
    expect(await pathExists(join(assets, 'b', 'Twin.png'))).toBe(true)
  })

  it('a replaced banner Pommora minted under .nexus/assets is still cleaned up', async () => {
    // No asset_directory: the default root is Pommora's own, and what it minted there is its own.
    expect((await setBanner(await pick('First.png'))).ok).toBe(true)
    expect(await pathExists(join(root, '.nexus/assets/First.png'))).toBe(true)
    expect((await setBanner(await pick('Second.png'))).ok).toBe(true)
    expect(await pathExists(join(root, '.nexus/assets/First.png'))).toBe(false)
  })

  it('sets a banner on a set sidecar', async () => {
    await withAssetDir()
    const r = await handleMutate(
      { op: 'setBanner', path: 'Notes/Daily', kind: 'set', source: await pick('Set.png') },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(JSON.parse(await read('Notes/Daily/_pageset.json')).banner).toBe('[[Set.png]]')
  })

  it('readNexus surfaces the banner value on collection + set nodes', async () => {
    await withAssetDir()
    await setBanner(await pick('Coll.png'))
    await handleMutate(
      { op: 'setBanner', path: 'Notes/Daily', kind: 'set', source: await pick('Sub.png') },
      nexusDeps,
    )
    const tree = await readNexus(root)
    const coll = tree.collections.find((c) => c.id === 'pt')
    expect(coll?.banner).toBe('[[Coll.png]]')
    expect(coll?.sets.find((s) => s.id === 'col')?.banner).toBe('[[Sub.png]]')
  })

  it('clearing removes the field and deletes what Pommora minted', async () => {
    expect((await setBanner(await pick('Gone.png'))).ok).toBe(true)
    const r = await setBanner(null)
    expect(r.ok).toBe(true)
    expect(await bannerOf()).toBeUndefined()
    expect(await pathExists(join(root, '.nexus/assets/Gone.png'))).toBe(false)
  })

  it('sets a page banner as the `cover` frontmatter key; clearing reverts', async () => {
    const assets = await withAssetDir()
    const created = await handleMutate(
      { op: 'createPage', parentPath: 'Notes/Daily', name: 'Cover' },
      nexusDeps,
    )
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const pagePath = created.value.created!.path
    const r = await handleMutate(
      { op: 'setBanner', path: pagePath, kind: 'page', source: await pick('Page.png') },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(await read(pagePath)).toMatch(/cover: ["']\[\[Page\.png\]\]["']/)
    expect(await pathExists(join(assets, 'Page.png'))).toBe(true)
    const cleared = await handleMutate(
      { op: 'setBanner', path: pagePath, kind: 'page', source: null },
      nexusDeps,
    )
    expect(cleared.ok).toBe(true)
    expect(await read(pagePath)).not.toMatch(/cover:/)
  })

  it('sets a homepage banner in .nexus/homepage.json', async () => {
    await withAssetDir()
    const r = await handleMutate(
      { op: 'setBanner', path: '', kind: 'homepage', source: await pick('Home.png') },
      nexusDeps,
    )
    expect(r.ok).toBe(true)
    expect(JSON.parse(await read('.nexus/homepage.json')).banner).toBe('[[Home.png]]')
    expect((await readNexus(root)).homepage.banner).toBe('[[Home.png]]')
  })
})

describe('handleMutate — setCrop', () => {
  let outside: string
  beforeEach(async () => {
    outside = await mkdtemp(join(tmpdir(), 'pom-pick-'))
  })
  afterEach(async () => {
    await rm(outside, { recursive: true, force: true })
  })
  const pick = async (name: string, body = 'image-bytes'): Promise<string> => {
    const p = join(outside, name)
    await writeFile(p, body)
    return p
  }
  const setBannerPage = (source: string | null) =>
    handleMutate({ op: 'setBanner', path: 'Notes/Daily/Alpha.md', kind: 'page', source }, nexusDeps)
  const setCrop = (image: string, crop: Crop | null) =>
    handleMutate({ op: 'setCrop', image, crop }, nexusDeps)
  const cropsOf = async (): Promise<Record<string, Crop> | undefined> => {
    try {
      return JSON.parse(await read('.nexus/crops.json')).byImage
    } catch {
      return undefined
    }
  }

  it('stores the crop at the resolved path with the zoom clamped', async () => {
    await setBannerPage(await pick('Cover.png'))
    const r = await setCrop('[[Cover.png]]', { x: 0.3, y: 0.4, zoom: 99 })
    expect(r.ok).toBe(true)
    expect(await cropsOf()).toEqual({
      '.nexus/assets/Cover.png': { x: 0.3, y: 0.4, zoom: 2 },
    })
  })

  it('refuses an ambiguous name, writing nothing', async () => {
    await writeFile(
      join(root, '.nexus', 'settings.json'),
      JSON.stringify({ asset_directory: 'file-assets' }),
    )
    for (const sub of ['a', 'b']) {
      await mkdir(join(root, 'file-assets', sub), { recursive: true })
      await writeFile(join(root, 'file-assets', sub, 'Twin.png'), 'bytes')
    }
    await openSession(root)
    const r = await setCrop('[[Twin.png]]', { x: 0.5, y: 0.5, zoom: 1 })
    expect(r.ok).toBe(false)
    expect(await cropsOf()).toBeUndefined()
  })

  it('a URL value keys the crop by its raw string', async () => {
    const r = await setCrop('https://example.com/a.png', { x: 0.2, y: 0.2, zoom: 1.5 })
    expect(r.ok).toBe(true)
    expect(await cropsOf()).toEqual({
      'https://example.com/a.png': { x: 0.2, y: 0.2, zoom: 1.5 },
    })
  })

  it('null deletes the key and preserves a foreign top-level key', async () => {
    await setBannerPage(await pick('Cover.png'))
    await setCrop('[[Cover.png]]', { x: 0.3, y: 0.4, zoom: 2 })
    const raw = JSON.parse(await read('.nexus/crops.json'))
    await writeFile(
      join(root, '.nexus', 'crops.json'),
      JSON.stringify({ ...raw, plugin_field: 'keep' }),
    )
    const r = await setCrop('[[Cover.png]]', null)
    expect(r.ok).toBe(true)
    expect(await cropsOf()).toEqual({})
    expect(JSON.parse(await read('.nexus/crops.json')).plugin_field).toBe('keep')
  })

  // Negative control: replacing a page's cover clears the old cover's crop (dropReplacedAsset),
  // and leaves every other key untouched. Remove the updateCrops call in dropReplacedAsset and
  // the first assertion goes red.
  it('a replaced cover clears its old crop and leaves other keys untouched', async () => {
    await setBannerPage(await pick('Cover.png'))
    await setCrop('[[Cover.png]]', { x: 0.3, y: 0.4, zoom: 2 })
    await setCrop('https://example.com/keep.png', { x: 0.5, y: 0.5, zoom: 1 })
    expect(await setBannerPage(await pick('Next.png'))).toMatchObject({ ok: true })
    const crops = await cropsOf()
    expect(crops?.['.nexus/assets/Cover.png']).toBeUndefined()
    expect(crops?.['https://example.com/keep.png']).toEqual({ x: 0.5, y: 0.5, zoom: 1 })
  })

  it('a corrupt crops.json does not fail a banner replace (best-effort crop cleanup)', async () => {
    await setBannerPage(await pick('Cover.png'))
    await writeFile(join(root, '.nexus', 'crops.json'), '[]') // valid JSON, not an object
    expect((await setBannerPage(await pick('Next.png'))).ok).toBe(true)
  })

  // Main-side half of the must-agree; the renderer-side (resolveAssetValue → cropKeyFor) is
  // asserted in AssetImage.test — a single test can't import both across the process boundary.
  it('keys the image main-side by its resolved nexus-relative path', async () => {
    await setBannerPage(await pick('Cover.png'))
    const value = '[[Cover.png]]'
    expect(cropKeyFor(await assetFilePath(root, value), value)).toBe('.nexus/assets/Cover.png')
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
    expect(splitFrontmatter(md).Stage).toEqual(['done'])
  })

  it('writes no modified_at on a property VALUE change — the file mtime is the edit record', async () => {
    await handleMutate(
      {
        op: 'setProperty',
        path: 'Notes/Daily/Beta.md',
        propertyId: 'prop_s',
        value: { kind: 'select', value: 'done' },
      },
      nexusDeps,
    )
    expect('modified_at' in splitFrontmatter(await read('Notes/Daily/Beta.md'))).toBe(false)
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
    expect(splitFrontmatter(await read('Notes/Daily/Beta.md')).Stage).toBeUndefined()
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
    expect(splitFrontmatter(md).Tags).toBeUndefined()
    expect(md).not.toContain('Tags')
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

describe('adoptFile — the shared adoption seam', () => {
  let outside: string
  beforeEach(async () => {
    outside = await mkdtemp(join(tmpdir(), 'pom-adopt-'))
    await writeFile(
      join(root, '.nexus', 'settings.json'),
      JSON.stringify({ asset_directory: 'file-assets' }),
    )
    await mkdir(join(root, 'file-assets'), { recursive: true })
  })
  afterEach(async () => {
    await rm(outside, { recursive: true, force: true })
  })
  const pick = async (name: string, body = 'bytes'): Promise<string> => {
    const p = join(outside, name)
    await writeFile(p, body)
    return p
  }

  it('the extension gate is per caller: a banner takes images, a file property takes anything', async () => {
    const pdf = await pick('Report.pdf')
    expect(await adoptFile(root, pdf, { allow: 'image' })).toMatchObject({ ok: false })
    const any = await adoptFile(root, pdf, { allow: 'any' })
    expect(any).toEqual({ ok: true, value: '[[Report.pdf]]' })
    expect(await pathExists(join(root, 'file-assets', 'Report.pdf'))).toBe(true)
  })

  it('a name the link grammar cannot spell is refused whatever the caller allows', async () => {
    // `|` splits off an alias and `]` closes the link early, so either one silently retargets the
    // reference at something that is not the file. Widening the extension gate must not reach this.
    for (const name of ['Q3|draft.pdf', 'Summary]].pdf'])
      expect(await adoptFile(root, await pick(name), { allow: 'any' })).toMatchObject({ ok: false })
    expect(await readdir(join(root, 'file-assets'))).toEqual([])
  })

  it('lands the file in the subfolder its property names, still answering by basename', async () => {
    const r = await adoptFile(root, await pick('Spec.pdf'), {
      allow: 'any',
      subfolder: 'Attachments',
    })
    expect(r).toEqual({ ok: true, value: '[[Spec.pdf]]' })
    expect(await pathExists(join(root, 'file-assets', 'Attachments', 'Spec.pdf'))).toBe(true)
  })

  it('an absent subfolder lands in the asset root itself', async () => {
    const r = await adoptFile(root, await pick('Loose.pdf'), { allow: 'any', subfolder: '' })
    expect(r).toEqual({ ok: true, value: '[[Loose.pdf]]' })
    expect(await pathExists(join(root, 'file-assets', 'Loose.pdf'))).toBe(true)
  })

  it('a basename held in ANOTHER subfolder steps aside — one namespace, wherever the files sit', async () => {
    await adoptFile(root, await pick('Doc.pdf', 'first'), { allow: 'any', subfolder: 'A' })
    const second = await adoptFile(root, await pick('Doc.pdf', 'second'), {
      allow: 'any',
      subfolder: 'B',
    })
    expect(second).toEqual({ ok: true, value: '[[Doc 2.pdf]]' })
  })

  it('refuses a subfolder that climbs out of the asset root, writing nothing', async () => {
    // `rootSegs` drops empty segments but NOT `..`, and `join` then collapses them straight past
    // the root — so an unrefused destination is an arbitrary-file-write primitive: `'../..'` lands
    // in the nexus root, `'../../..'` outside the nexus entirely.
    for (const subfolder of ['..', '../..', '../../..', 'a/../..', '/etc', '.\\..'])
      expect(
        await adoptFile(root, await pick('Evil.pdf'), { allow: 'any', subfolder }),
      ).toMatchObject({
        ok: false,
      })
    expect(await readdir(join(root, 'file-assets'))).toEqual([])
    expect(await pathExists(join(root, 'Evil.pdf'))).toBe(false)
    expect(await pathExists(join(root, '.nexus', 'Evil.pdf'))).toBe(false)
  })

  it('refuses a subfolder the map could never index', async () => {
    // `.private` is contained, mkdirs, writes, and answers a valid-looking reference — while the
    // map drops it forever, leaving an unresolved label and no error anywhere.
    const r = await adoptFile(root, await pick('Hidden.pdf'), {
      allow: 'any',
      subfolder: '.private',
    })
    expect(r.ok).toBe(false)
    expect(await readdir(join(root, 'file-assets'))).toEqual([])
  })

  it('refuses a name that cannot be written as a link and read back', async () => {
    // The reference pattern is single-line, so a name carrying a break mints one that writes and
    // never parses — the same permanent blank the bracket and pipe refusals exist to prevent.
    for (const name of ['line\nbreak.pdf', 'Q3|draft.pdf', 'Summary]].pdf'])
      expect(await adoptFile(root, await pick(name), { allow: 'any' })).toMatchObject({ ok: false })
    expect(await readdir(join(root, 'file-assets'))).toEqual([])
  })

  it('refuses a subfolder that is a symlink INTO the nexus — the lexical check cannot see it', async () => {
    // A linked attachments folder is ordinary in a vault. Containment passes, and `resolveUnderRoot`
    // bounds the NEXUS, which a link at the content tree satisfies — so the bytes would land among
    // the user's pages, under a name `buildAssetMap` never walks into and can never resolve again.
    await mkdir(join(root, 'Projects', 'Secret'), { recursive: true })
    await symlink(join(root, 'Projects', 'Secret'), join(root, 'file-assets', 'Linked'))

    const r = await adoptFile(root, await pick('Leak.pdf'), { allow: 'any', subfolder: 'Linked' })

    expect(r.ok).toBe(false)
    expect(await readdir(join(root, 'Projects', 'Secret'))).toEqual([])
  })

  it('a pick from a hidden folder UNDER the root is copied out, never referenced in place', async () => {
    // `underAssetRoot` admits the dot-prefixed segment `indexable` drops, so an in-place reference
    // here would name a file the map can never hold — resolvable by nothing, with no error anywhere.
    await mkdir(join(root, 'file-assets', '.archive'), { recursive: true })
    await writeFile(join(root, 'file-assets', '.archive', 'Buried.pdf'), 'buried-bytes')

    const r = await adoptFile(root, join(root, 'file-assets', '.archive', 'Buried.pdf'), {
      allow: 'any',
      subfolder: 'Docs',
    })

    expect(r).toEqual({ ok: true, value: '[[Buried.pdf]]' })
    expect(await pathExists(join(root, 'file-assets', 'Docs', 'Buried.pdf'))).toBe(true)
    expect(resolveAssetName(await liveAssetMap(root), 'Buried.pdf')).toBe(
      'file-assets/Docs/Buried.pdf',
    )
  })

  it('never deletes: adopting a replacement leaves the file the old reference named', async () => {
    const first = await adoptFile(root, await pick('Old.pdf'), { allow: 'any' })
    expect(first.ok).toBe(true)
    const second = await adoptFile(root, await pick('New.pdf'), { allow: 'any' })
    expect(second.ok).toBe(true)
    expect(await pathExists(join(root, 'file-assets', 'Old.pdf'))).toBe(true)
  })
})

describe('a file value never destroys what it stops naming', () => {
  // The seam dedups, so two pages picking the same source share ONE file on disk. A Replace that
  // ever learned to delete would destroy what another page's reference names, unrecoverably — and
  // the deleting path (`dropReplacedAsset`) is safe for banners only because they are singletons.
  // This asserts the FILE, not the absence of a call: a call-spy passes with zero implementation.
  beforeEach(async () => {
    await createProperty(root, { id: 'prop_f', name: 'Attachments', type: 'file' })
    await writeFile(
      join(root, '.nexus', 'settings.json'),
      JSON.stringify({ asset_directory: 'file-assets' }),
    )
    await mkdir(join(root, 'file-assets'), { recursive: true })
    for (const name of ['Old.pdf', 'New.pdf'])
      await writeFile(join(root, 'file-assets', name), `${name}-bytes`)
  })

  const setFiles = (path: string, value: string[]) =>
    handleMutate(
      { op: 'setProperty', path, propertyId: 'prop_f', value: { kind: 'file', value } },
      nexusDeps,
    )

  it('replacing a reference leaves the file it named on disk', async () => {
    expect((await setFiles('Notes/Daily/Beta.md', ['[[Old.pdf]]'])).ok).toBe(true)
    expect((await setFiles('Notes/Daily/Beta.md', ['[[New.pdf]]'])).ok).toBe(true)
    expect(splitFrontmatter(await read('Notes/Daily/Beta.md')).Attachments).toEqual(['[[New.pdf]]'])
    expect(await pathExists(join(root, 'file-assets', 'Old.pdf'))).toBe(true)
  })

  it('clearing the last reference leaves the file, and takes the key', async () => {
    expect((await setFiles('Notes/Daily/Beta.md', ['[[Old.pdf]]'])).ok).toBe(true)
    expect((await setFiles('Notes/Daily/Beta.md', [])).ok).toBe(true)
    expect(splitFrontmatter(await read('Notes/Daily/Beta.md')).Attachments).toBeUndefined()
    expect(await pathExists(join(root, 'file-assets', 'Old.pdf'))).toBe(true)
  })

  it('a file another page still names survives the first page dropping it', async () => {
    expect((await setFiles('Notes/Daily/Alpha.md', ['[[Old.pdf]]'])).ok).toBe(true)
    expect((await setFiles('Notes/Daily/Beta.md', ['[[Old.pdf]]'])).ok).toBe(true)
    expect((await setFiles('Notes/Daily/Alpha.md', ['[[New.pdf]]'])).ok).toBe(true)
    expect(splitFrontmatter(await read('Notes/Daily/Beta.md')).Attachments).toEqual(['[[Old.pdf]]'])
    expect(await pathExists(join(root, 'file-assets', 'Old.pdf'))).toBe(true)
  })
})

describe('the acceptance chain, read raw off the disk at every step', () => {
  // The per-step facts each have their own test; this is the one that crosses them the way a
  // session does — pick, add, add, replace, remove, clear — asserting the page's actual bytes,
  // since the criterion is what an outside tool sees, not what the decoder answers.
  let outside: string
  beforeEach(async () => {
    outside = await mkdtemp(join(tmpdir(), 'pom-chain-'))
    await createProperty(root, { id: 'prop_f', name: 'Attachments', type: 'file' })
    await writeFile(
      join(root, '.nexus', 'settings.json'),
      JSON.stringify({ asset_directory: 'file-assets' }),
    )
    await mkdir(join(root, 'file-assets'), { recursive: true })
  })
  afterEach(async () => {
    await rm(outside, { recursive: true, force: true })
  })
  const pick = async (name: string, body: string): Promise<string> => {
    const p = join(outside, name)
    await writeFile(p, body)
    return p
  }
  const setFiles = (value: string[]) =>
    handleMutate(
      {
        op: 'setProperty',
        path: 'Notes/Daily/Beta.md',
        propertyId: 'prop_f',
        value: { kind: 'file', value },
      },
      nexusDeps,
    )

  it('pick lands under the Directory, the page spells a quoted wikilink, and every later step leaves the rest alone', async () => {
    const first = await adoptFile(root, await pick('Spec.pdf', 'spec-bytes'), {
      allow: 'any',
      subfolder: 'Reports',
    })
    expect(first).toEqual({ ok: true, value: '[[Spec.pdf]]' })
    expect(await pathExists(join(root, 'file-assets', 'Reports', 'Spec.pdf'))).toBe(true)
    expect((await setFiles(['[[Spec.pdf]]'])).ok).toBe(true)
    expect(await read('Notes/Daily/Beta.md')).toContain('Attachments:\n  - "[[Spec.pdf]]"')

    const second = await adoptFile(root, await pick('Notes.txt', 'note-bytes'), {
      allow: 'any',
      subfolder: 'Reports',
    })
    expect(second).toEqual({ ok: true, value: '[[Notes.txt]]' })
    expect((await setFiles(['[[Spec.pdf]]', '[[Notes.txt]]'])).ok).toBe(true)
    expect(await read('Notes/Daily/Beta.md')).toContain(
      'Attachments:\n  - "[[Spec.pdf]]"\n  - "[[Notes.txt]]"',
    )

    const replacement = await adoptFile(root, await pick('Final.pdf', 'final-bytes'), {
      allow: 'any',
      subfolder: 'Reports',
    })
    expect(replacement).toEqual({ ok: true, value: '[[Final.pdf]]' })
    expect((await setFiles(['[[Final.pdf]]', '[[Notes.txt]]'])).ok).toBe(true)
    expect(await read('Notes/Daily/Beta.md')).toContain(
      'Attachments:\n  - "[[Final.pdf]]"\n  - "[[Notes.txt]]"',
    )
    expect(await pathExists(join(root, 'file-assets', 'Reports', 'Spec.pdf'))).toBe(true)

    expect((await setFiles(['[[Final.pdf]]'])).ok).toBe(true)
    expect(await read('Notes/Daily/Beta.md')).toContain('Attachments:\n  - "[[Final.pdf]]"')
    expect((await setFiles([])).ok).toBe(true)
    expect(await read('Notes/Daily/Beta.md')).not.toContain('Attachments')
    for (const name of ['Spec.pdf', 'Notes.txt', 'Final.pdf'])
      expect(await pathExists(join(root, 'file-assets', 'Reports', name))).toBe(true)
  })

  it('re-picking a source already adopted answers the existing reference, not a copy', async () => {
    const source = await pick('Same.pdf', 'same-bytes')
    expect(await adoptFile(root, source, { allow: 'any', subfolder: 'Reports' })).toEqual({
      ok: true,
      value: '[[Same.pdf]]',
    })
    expect(await adoptFile(root, source, { allow: 'any', subfolder: 'Reports' })).toEqual({
      ok: true,
      value: '[[Same.pdf]]',
    })
    expect(await readdir(join(root, 'file-assets', 'Reports'))).toEqual(['Same.pdf'])
  })
})
