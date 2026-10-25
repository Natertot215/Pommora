import { applyEvents } from '../Nexus/fileEvents'
import { settleNow } from '../Nexus/settle'
import { chmod, copyFile, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { newContentId, newId } from '../Nexus/ids'
import { ID_KEY } from '../Nexus/identityMark'
import { join, relative } from '../Paths/posix'
import { noModeBits, putJson, readJsonAt, seedNexus, tempRoot } from '../Testing/hostFs'
import * as atomicWrite from '../Files/atomicWrite'
import { pathExists } from '../Files/atomicWrite'
import * as contextsRegistry from '../Contexts/contextsRegistry'
import { fault } from '../Contract/result'
import { handleMutate } from '../Nexus/mutate'
import { readNotes } from '../Nexus/owed'
import { finishOwed } from '../Nexus/finishOwed'
import { listBundles, mintBundle } from '../Bundles/bundle'
import { installStores, NO_STORES } from '../Platform/stores'
import { memoryStores } from '../Testing/memoryStores'
import { seedContentIndex } from '../Index/indexSeed'
import { type ConfigSurfaces, seedConfigSurfaces, viewOn } from '../Testing/configSurfaces'
import { settledMutate } from '../Testing/settledMutate'
import { createFolderEntity } from '../Nexus/folderEntity'
import { createTestPage } from '../Testing/createTestPage'
import { splitFrontmatter } from '../Files/pageFile'
import type { PropertyDefinition } from '../Properties/properties'
import { dropLiveTree, refreshTree } from '../Nexus/liveTree'
import { closeSession, openSession } from '../Nexus/session'
import { setPanelContextOrder } from '../Nexus/reorder'
import { type HeldKind, unsweptLine } from '../Nexus/entities'
import { contextsDir, contextsRegistryFile, nexusConfig, sidecarPath } from '../Paths/paths'
import { NEXUS_CONFIG_FILES, OWED_REL, SIDECAR_FILENAME } from '../Paths/nexusPaths'
import type { FilterGroup } from '../Views/filterRules'
import { filterSeeds } from '../Views/Pipeline/creationSeeds'
import type { TrashDeps } from './discard'

type Raw = Record<string, unknown>

const nexusDeps: TrashDeps = { trashMode: 'nexus', trashToSystem: async () => {} }

let root: string
let notes: string

const view = (rules: unknown[], extra: Raw = {}): Raw => ({
  id: 'view_1',
  name: 'V',
  type: 'table',
  filter: { match: 'all', rules },
  ...extra,
})

const del = (path: string, kind: HeldKind) =>
  settledMutate(root, { op: 'delete', path, kind }, nexusDeps)

const entity = async (
  parent: string,
  kind: 'collection' | 'set',
  name: string,
): Promise<{ id: string; path: string }> => {
  const id = newId()
  const made = await createFolderEntity(parent, kind, name, id)
  if (!made.ok) throw new Error(`${name} failed`)
  return { id, ...made.value }
}

const addWork = (): Promise<void> =>
  putJson(join(contextsDir(root), 'Areas', 'Work', SIDECAR_FILENAME.space), { id: 'sp_work' })

const RELATED = {
  id: 'prop_related',
  label: 'Related',
  key: 'Related',
  type: 'link',
} as PropertyDefinition

const addRelated = (): Promise<void> => seedNexus(root, { defs: [RELATED] })

const page = async (parent: string, name: string, links?: string): Promise<string> => {
  const made = await createTestPage(parent, name, {
    frontmatter: links ? { [RELATED.key]: `[[${links}]]` } : {},
  })
  if (!made.ok) throw new Error(`${name} failed`)
  return made.value.path
}

const idOf = async (file: string): Promise<unknown> =>
  splitFrontmatter(await readFile(file, 'utf8')).ID

const recordOf = (bundlePath: string): Promise<Raw> =>
  readJsonAt(join(root, bundlePath, '_record.json'))

beforeEach(async () => {
  root = tempRoot('pom-delete-reach-')
  await putJson(nexusConfig(root, NEXUS_CONFIG_FILES.identity), { id: 'nx', createdAt: '2026' })
  notes = (await entity(root, 'collection', 'Notes')).path
  await openSession(root)
})

afterEach(async () => {
  dropLiveTree()
  closeSession()
  await rm(root, { recursive: true, force: true })
})

describe('a page delete', () => {
  beforeEach(async () => {
    await addRelated()
    await page(notes, 'Target')
  })

  it('replies with the pages whose Link values named it', async () => {
    await page(notes, 'One', 'Target')
    await page(notes, 'Two', 'Target')
    await refreshTree(root)
    const r = await del('Notes/Target.md', 'page')
    if (!r.ok) throw new Error(r.error.message)
    r.value.cascade?.pages.sort()
    expect(r.value.cascade).toEqual({ pages: ['Notes/One.md', 'Notes/Two.md'], hosts: [] })
  })

  it('leaves an ID-less linker the tree doesn’t hold unstamped and byte-identical', async () => {
    const loose = join(notes, 'Loose.md')
    const content = '---\nRelated: "[[Target]]"\n---\n'
    await writeFile(loose, content)
    await refreshTree(root)
    const r = await del('Notes/Target.md', 'page')
    if (!r.ok || !r.value.bundled) throw new Error('the delete did not trash')
    expect(r.value.cascade?.pages ?? []).toEqual([])
    expect((await recordOf(r.value.bundled.bundlePath)).links ?? []).toEqual([])
    expect(await readFile(loose, 'utf8')).toBe(content)
  })

  it('leaves two linkers sharing one ID as they were, since a restore couldn’t tell them apart', async () => {
    const twin = await page(notes, 'Twin', 'Target')
    await copyFile(twin, join(notes, 'Twin copy.md'))
    await refreshTree(root)
    const r = await del('Notes/Target.md', 'page')
    if (!r.ok || !r.value.bundled) throw new Error('the delete did not trash')
    expect(r.value.cascade).toEqual({
      pages: [],
      hosts: [],
      warning: unsweptLine(2),
      owed: true,
    })
    expect(splitFrontmatter(await readFile(twin, 'utf8')).Related).toBe('[[Target]]')
    expect(await recordOf(r.value.bundled.bundlePath)).not.toHaveProperty('partial')
    expect((await recordOf(r.value.bundled.bundlePath)).links).toBeUndefined()
  })

  it('replies with an empty report when nothing links it', async () => {
    await refreshTree(root)
    const r = await del('Notes/Target.md', 'page')
    expect(r.ok && r.value.cascade).toEqual({ pages: [], hosts: [] })
  })
})

describe('a Space delete', () => {
  it('strips the Space from the rules on its Context in every view, tile, the Matrix, and the preview rules', async () => {
    const surfaces = await seedConfigSurfaces(
      root,
      notes,
      view([
        { property_id: 'ctx_areas', op: 'contains_any', values: ['sp_work', 'sp_home'] },
        { property_id: 'ctx_areas', op: 'does_not_contain', values: ['sp_work'] },
      ]),
    )
    await addWork()
    await refreshTree(root)
    const r = await del('.nexus/contexts/Areas/Work', 'space')
    expect(r.ok && r.value.cascade).toEqual({
      pages: [],
      hosts: [{ host: { kind: 'space', id: 'sp_home' }, ids: [] }],
    })
    const kept = {
      match: 'all',
      rules: [{ property_id: 'ctx_areas', op: 'contains_any', values: ['sp_home'] }],
    }
    const v = await surfaces.read()
    expect([v.collection.filter, v.set.filter, v.tile.filter, v.matrix, v.preview]).toEqual([
      kept,
      kept,
      kept,
      kept,
      kept,
    ])
  })

  it('lets a view filtered to only that Space create pages again', async () => {
    const surfaces = await seedConfigSurfaces(
      root,
      notes,
      view([{ property_id: 'ctx_areas', op: 'contains_any', values: ['sp_work'] }]),
    )
    await addWork()
    await refreshTree(root)
    expect((await del('.nexus/contexts/Areas/Work', 'space')).ok).toBe(true)
    const { collection } = await surfaces.read()
    const id = newContentId('page')
    const seeds = filterSeeds({
      filter: collection.filter as FilterGroup,
      blank: {
        id,
        title: 'Fresh',
        path: 'Notes/Fresh.md',
        frontmatter: { [ID_KEY]: id },
        createdAt: null,
        modifiedAt: null,
      },
      schema: [],
      setTree: [],
      contextIds: ['ctx_areas'],
    })
    const r = await settledMutate(
      root,
      { op: 'createPage', id, parentPath: 'Notes', name: 'Fresh', seeds },
      nexusDeps,
    )
    expect(r.ok ? 'created' : r.error.message).toBe('created')
  })
})

describe('a Context delete', () => {
  it('clears the Context from every view and tile, and its rule from the Matrix and the preview rules', async () => {
    const held = view([{ property_id: 'ctx_projects', op: 'contains_any', values: ['sp_x'] }], {
      property_order: ['_title', 'ctx_projects'],
      hidden_properties: ['ctx_projects'],
      column_widths: { ctx_projects: 90 },
      sort: [{ property_id: 'ctx_projects', direction: 'ascending' }],
      filter_enabled: false,
    })
    const surfaces = await seedConfigSurfaces(root, notes, held)
    await putJson(contextsRegistryFile(root), {
      contexts: [
        { id: 'ctx_areas', title: 'Areas' },
        { id: 'ctx_projects', title: 'Projects' },
      ],
    })
    await mkdir(join(contextsDir(root), 'Projects'))
    await refreshTree(root)
    expect((await del('.nexus/contexts/Projects', 'context')).ok).toBe(true)
    const cleared = {
      ...held,
      property_order: ['_title'],
      hidden_properties: [],
      column_widths: {},
      filter: undefined,
      sort: [],
    }
    const v = await surfaces.read()
    expect([v.collection, v.set, v.tile]).toEqual([cleared, cleared, cleared])
    expect([v.collection, v.set, v.tile].some((c) => 'filter' in c)).toBe(false)
    expect(v.matrix).toBeNull()
    expect(v.preview).toBeUndefined()
  })
})

describe('a Set delete', () => {
  let surfaces: ConfigSurfaces
  let gone: { id: string; path: string }
  let located: Raw
  let stripped: Raw
  let goneTile: Raw
  let goneSidecar: string

  const trashGone = async (): Promise<string> => {
    const r = await del('Notes/Gone', 'set')
    const bundlePath = r.ok ? r.value.bundled?.bundlePath : undefined
    if (!bundlePath) throw new Error('the delete did not trash')
    return bundlePath
  }

  beforeEach(async () => {
    gone = await entity(notes, 'set', 'Gone')
    const sub = await entity(gone.path, 'set', 'Sub')
    const keep = await entity(notes, 'set', 'Keep')
    located = view(
      [
        { property_id: '_location', op: 'is', values: [gone.id, keep.id] },
        { property_id: '_location', op: 'is_inside', values: [sub.id] },
      ],
      {
        group_order: [gone.id, keep.id, sub.id],
        hidden_groups: [gone.id, sub.id],
        collapsed_groups: [gone.id, `${gone.id}/Done`, keep.id],
      },
    )
    stripped = view([{ property_id: '_location', op: 'is', values: [keep.id] }], {
      group_order: [keep.id],
      hidden_groups: [],
      collapsed_groups: [keep.id],
    })
    surfaces = await seedConfigSurfaces(root, notes, located)
    const goneFile = sidecarPath(gone.path, 'set')
    await putJson(goneFile, { ...(await readJsonAt(goneFile)), views: [located] })
    goneSidecar = await readFile(goneFile, 'utf8')
    goneTile = { id: 'u', type: 'view', views: [{ source_id: gone.id, config: located }] }
    const board = await readJsonAt(surfaces.tiles)
    await putJson(surfaces.tiles, { tiles: [...(board.tiles as Raw[]), goneTile] })
    await refreshTree(root)
  })

  it('strips it and its Sets from Location rules and band keys everywhere, and leaves a tile sourced from it', async () => {
    const r = await del('Notes/Gone', 'set')
    expect(r.ok && r.value.cascade).toEqual({
      pages: [],
      hosts: [{ host: { kind: 'space', id: 'sp_home' }, ids: [] }],
    })
    const v = await surfaces.read()
    expect([v.collection, v.set, v.tile]).toEqual([stripped, stripped, stripped])
    expect(v.matrix).toEqual(stripped.filter)
    expect(v.preview).toEqual(stripped.filter)
    expect(((await readJsonAt(surfaces.tiles)).tiles as Raw[])[1]).toEqual(goneTile)
  })

  it('leaves the trashed copy of its own sidecar byte-identical', async () => {
    const bundlePath = await trashGone()
    expect(await readFile(join(root, bundlePath, 'Gone', SIDECAR_FILENAME.set), 'utf8')).toBe(
      goneSidecar,
    )
  })

  it('restores the Set with its own views and none of the configuration that named it', async () => {
    const bundlePath = await trashGone()
    expect((await settledMutate(root, { op: 'restore', bundlePath }, nexusDeps)).ok).toBe(true)
    expect((await readJsonAt(sidecarPath(gone.path, 'set'))).views).toEqual([located])
    expect((await surfaces.read()).collection).toEqual(stripped)
  })

  it('runs the pass for a system-trash delete, which mints no bundle', async () => {
    const systemDeps: TrashDeps = {
      trashMode: 'system',
      trashToSystem: (abs) => rm(abs, { recursive: true, force: true }),
    }
    const r = await settledMutate(
      root,
      { op: 'delete', path: 'Notes/Gone', kind: 'set' },
      systemDeps,
    )
    expect(r.ok && r.value.bundled).toBeUndefined()
    expect(r.ok && r.value.cascade?.hosts).toEqual([
      { host: { kind: 'space', id: 'sp_home' }, ids: [] },
    ])
    expect((await surfaces.read()).collection).toEqual(stripped)
  })

  it('strips the Link values naming its pages outside it, and leaves the pages inside as they were', async () => {
    await addRelated()
    await page(gone.path, 'Inner')
    await page(join(gone.path, 'Sub'), 'Deep')
    const inside = await page(gone.path, 'Inside', 'Inner')
    const outside = await page(notes, 'Outside', 'Inner')
    const far = await page(notes, 'Far', 'Deep')
    const held = await readFile(inside, 'utf8')
    await refreshTree(root)
    const r = await del('Notes/Gone', 'set')
    if (!r.ok || !r.value.bundled) throw new Error('the delete did not trash')
    r.value.cascade?.pages.sort()
    expect(r.value.cascade).toEqual({
      pages: ['Notes/Far.md', 'Notes/Outside.md'],
      hosts: [{ host: { kind: 'space', id: 'sp_home' }, ids: [] }],
    })
    expect(
      await readFile(join(root, r.value.bundled.bundlePath, 'Gone', 'Inside.md'), 'utf8'),
    ).toBe(held)
    expect((await recordOf(r.value.bundled.bundlePath)).links).toEqual(
      expect.arrayContaining([
        { page: await idOf(outside), property: 'prop_related', value: '[[Inner]]' },
        { page: await idOf(far), property: 'prop_related', value: '[[Deep]]' },
      ]),
    )
  })

  it.skipIf(noModeBits)('counts the strip’s miss and the pass’s in one owed line', async () => {
    await addRelated()
    await page(gone.path, 'Inner')
    const other = await entity(root, 'collection', 'Other')
    const locked = await entity(other.path, 'set', 'Locked')
    await page(locked.path, 'X', 'Inner')
    await refreshTree(root)
    const otherFile = sidecarPath(other.path, 'collection')
    await rm(otherFile)
    await mkdir(otherFile)
    await applyEvents(root, [
      { event: 'unlink', absPath: otherFile, origin: 'watched' },
      { event: 'addDir', absPath: otherFile, origin: 'watched' },
    ])
    await settleNow({ push: () => {}, watch: async () => {} }, root)
    await chmod(locked.path, 0o555)
    try {
      const r = await del('Notes/Gone', 'set')
      if (!r.ok || !r.value.bundled) throw new Error('the delete did not trash')
      expect(r.value.cascade).toMatchObject({ warning: unsweptLine(2), owed: true })
      expect(await recordOf(r.value.bundled.bundlePath)).not.toHaveProperty('partial')
    } finally {
      await chmod(locked.path, 0o755)
    }
  })

  it('lands and warns when the pass can’t read a sidecar', async () => {
    const other = await entity(root, 'collection', 'Other')
    await refreshTree(root)
    const otherFile = sidecarPath(other.path, 'collection')
    await rm(otherFile)
    await mkdir(otherFile)
    await applyEvents(root, [
      { event: 'unlink', absPath: otherFile, origin: 'watched' },
      { event: 'addDir', absPath: otherFile, origin: 'watched' },
    ])
    await settleNow({ push: () => {}, watch: async () => {} }, root)
    const r = await del('Notes/Gone', 'set')
    expect(r.ok && r.value.cascade?.warning).toBe(unsweptLine(1))
  })
})

describe('a Collection delete', () => {
  it('strips it and its Sets from the Matrix and the preview rules, and leaves the surviving Collection', async () => {
    const surfaces = await seedConfigSurfaces(root, notes, viewOn('prop_s', 'Done'))
    const deep = (await readJsonAt(sidecarPath(surfaces.set, 'set'))).id
    const old = await entity(root, 'collection', 'Old')
    const oldSet = await entity(old.path, 'set', 'OldSet')
    const matrix = nexusConfig(root, NEXUS_CONFIG_FILES.matrix)
    const locatedRule = (values: unknown[]) => ({
      match: 'all',
      rules: [{ property_id: '_location', op: 'is', values }],
    })
    const filter = { rules: locatedRule([old.id, oldSet.id, deep]), enabled: true }
    await putJson(matrix, { filter })
    await putJson(nexusConfig(root, NEXUS_CONFIG_FILES.settings), {
      personalization: { openInPreview: filter },
    })
    await refreshTree(root)
    const before = await surfaces.read()
    expect((await del('Old', 'collection')).ok).toBe(true)
    const after = await surfaces.read()
    expect(after.matrix).toEqual(locatedRule([deep]))
    expect(after.preview).toEqual(locatedRule([deep]))
    expect({ ...after, matrix: null, preview: null }).toEqual({
      ...before,
      matrix: null,
      preview: null,
    })
  })
  describe('to the system trash', () => {
    const systemDeps: TrashDeps = {
      trashMode: 'system',
      trashToSystem: (abs) => rm(abs, { recursive: true, force: true }),
    }
    const archived = async (): Promise<string> =>
      join(
        root,
        '.nexus',
        'archive',
        String((await readJsonAt(sidecarPath(notes, 'collection'))).id),
      )
    const deleteNotes = () =>
      settledMutate(root, { op: 'delete', path: 'Notes', kind: 'collection' }, systemDeps)

    it('a Collection deleted to the system trash takes its Archive, its pages’ links stripped', async () => {
      await addRelated()
      await page(notes, 'Gone')
      const other = await entity(root, 'collection', 'Other')
      const linker = await page(other.path, 'Linker', 'Gone')
      await refreshTree(root)
      await settledMutate(root, { op: 'archive', path: 'Notes/Gone.md', kind: 'page' }, nexusDeps)
      const archive = await archived()
      const r = await deleteNotes()
      expect(r.ok && r.value.cascade?.pages).toEqual(['Other/Linker.md'])
      expect(await pathExists(archive)).toBe(false)
      expect(splitFrontmatter(await readFile(linker, 'utf8')).Related).toBeUndefined()
    })

    it('a Collection deleted to the system trash takes the saved views naming the Sets in its Archive', async () => {
      const daily = await entity(notes, 'set', 'Daily')
      const other = await entity(root, 'collection', 'Other')
      const otherFile = sidecarPath(other.path, 'collection')
      await putJson(otherFile, {
        ...(await readJsonAt(otherFile)),
        views: [view([{ property_id: '_location', op: 'is', values: [daily.id, other.id] }])],
      })
      await refreshTree(root)
      await settledMutate(root, { op: 'archive', path: 'Notes/Daily', kind: 'set' }, nexusDeps)
      expect((await deleteNotes()).ok).toBe(true)
      expect((await readJsonAt(otherFile)).views).toEqual([
        view([{ property_id: '_location', op: 'is', values: [other.id] }]),
      ])
    })
  })
})

describe('a Context or Space delete on the notes', () => {
  const AREAS = '.nexus/contexts/Areas'
  const WORK = `${AREAS}/Work`
  let a: string
  let b: string

  const tagsOf = async (file: string): Promise<unknown> =>
    splitFrontmatter(await readFile(file, 'utf8'))['<Areas>']

  beforeEach(async () => {
    await putJson(contextsRegistryFile(root), {
      contexts: [
        { id: 'ctx_first', title: 'First' },
        { id: 'ctx_areas', title: 'Areas' },
        { id: 'ctx_last', title: 'Last' },
      ],
    })
    await addWork()
    await putJson(join(contextsDir(root), 'Areas', 'Home', SIDECAR_FILENAME.space), {
      id: 'sp_home',
    })
    a = await page(notes, 'A')
    b = await page(notes, 'B')
    for (const file of [a, b])
      await writeFile(file, `---\nID: ${await idOf(file)}\n<Areas>:\n  - Work\n---\nbody\n`)
    await refreshTree(root)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    installStores(NO_STORES)
  })

  const shut = async <T>(file: string, run: () => Promise<T>): Promise<T> => {
    await chmod(file, 0o000)
    try {
      return await run()
    } finally {
      await chmod(file, 0o644)
    }
  }

  it.skipIf(noModeBits)(
    'a Context delete that misses a page finishes and owes the rest',
    async () => {
      const r = await shut(b, () => del(AREAS, 'context'))
      if (!r.ok || !r.value.bundled) throw new Error('the delete did not trash')
      const { bundlePath } = r.value.bundled
      expect(r.value.cascade?.owed).toBe(true)
      expect((await readJsonAt(contextsRegistryFile(root))).contexts).not.toContainEqual(
        expect.objectContaining({ id: 'ctx_areas' }),
      )
      expect(await pathExists(join(root, bundlePath, 'Areas'))).toBe(true)
      expect(await tagsOf(a)).toBeUndefined()
      expect(await readNotes(root)).toEqual({
        ctx_areas: { kind: 'context', strip: ['Areas'], bundle: bundlePath },
      })
    },
  )

  it.skipIf(noModeBits)(
    'a Space delete that misses a page finishes and owes the rest',
    async () => {
      const r = await shut(b, () => del(WORK, 'space'))
      if (!r.ok || !r.value.bundled) throw new Error('the delete did not trash')
      const { bundlePath } = r.value.bundled
      expect(r.value.cascade?.owed).toBe(true)
      expect(await pathExists(join(root, WORK))).toBe(false)
      expect(await pathExists(join(root, bundlePath, 'Work'))).toBe(true)
      expect(await tagsOf(a)).toBeUndefined()
      expect(await readNotes(root)).toEqual({
        sp_work: { kind: 'space', contextId: 'ctx_areas', strip: ['Work'], bundle: bundlePath },
      })
    },
  )

  it("a Space delete whose folder can't move deletes nothing and offers Try Again", async () => {
    vi.spyOn(atomicWrite, 'relocate').mockRejectedValueOnce(new Error('busy'))
    const r = await handleMutate(root, { op: 'delete', path: WORK, kind: 'space' }, nexusDeps)
    expect(r.ok).toBe(false)
    expect(await pathExists(join(root, WORK))).toBe(true)
    expect(await listBundles(root, { kind: 'trash' })).toEqual([])
    expect(await pathExists(join(root, OWED_REL))).toBe(false)
    expect(await tagsOf(a)).toEqual(['Work'])
    expect((await del(WORK, 'space')).ok).toBe(true)
    expect(await pathExists(join(root, WORK))).toBe(false)
  })

  it("a Context delete whose folder can't move puts its entry back", async () => {
    vi.spyOn(atomicWrite, 'relocate').mockRejectedValueOnce(new Error('busy'))
    const r = await handleMutate(root, { op: 'delete', path: AREAS, kind: 'context' }, nexusDeps)
    expect(r.ok).toBe(false)
    expect(
      (await readJsonAt<{ contexts: Raw[] }>(contextsRegistryFile(root))).contexts.map((c) => c.id),
    ).toEqual(['ctx_first', 'ctx_areas', 'ctx_last'])
    expect(await readNotes(root)).toEqual({})

    vi.spyOn(atomicWrite, 'relocate').mockRejectedValueOnce(new Error('busy'))
    // The list step leaves through `unlistContext`, so the spy meets only the put-back.
    vi.spyOn(contextsRegistry, 'mutateRegistryFile').mockResolvedValueOnce(fault('refused'))
    const stuck = await handleMutate(
      root,
      { op: 'delete', path: AREAS, kind: 'context' },
      nexusDeps,
    )
    vi.restoreAllMocks()
    if (!stuck.ok) throw new Error(stuck.error.message)
    expect(stuck.value.cascade?.owed).toBe(true)
    expect(await pathExists(join(root, AREAS))).toBe(true)
    expect(await readNotes(root)).toMatchObject({
      ctx_areas: { kind: 'context', strip: ['Areas'] },
    })
    await finishOwed(root, nexusDeps)
    expect(await pathExists(join(root, AREAS))).toBe(false)
    expect(await tagsOf(a)).toBeUndefined()
    expect(await readNotes(root)).toEqual({})
  })

  it('a System Trash Context delete whose move fails keeps its order', async () => {
    await setPanelContextOrder(root, ['ctx_first', 'ctx_areas', 'ctx_last'])
    const r = await handleMutate(
      root,
      { op: 'delete', path: AREAS, kind: 'context' },
      { trashMode: 'system', trashToSystem: () => Promise.reject(new Error('busy')) },
    )
    expect(r.ok).toBe(false)
    expect(await pathExists(join(root, AREAS))).toBe(true)
    expect(
      (await readJsonAt<{ order: Raw }>(nexusConfig(root, NEXUS_CONFIG_FILES.state))).order,
    ).toEqual({ contexts: ['ctx_first', 'ctx_areas', 'ctx_last'] })
  })

  it.skipIf(noModeBits)(
    "the Trash record of a partial delete holds the unreached page's tags",
    async () => {
      installStores(memoryStores().stores)
      await seedContentIndex(root)
      const id = await idOf(b)
      const r = await shut(b, () => del(AREAS, 'context'))
      if (!r.ok || !r.value.bundled) throw new Error('the delete did not trash')
      expect((await recordOf(r.value.bundled.bundlePath)).membership).toContainEqual({
        root: { id, kind: 'page' },
        spaces: [{ id: 'sp_work', title: 'Work' }],
      })
    },
  )

  it("a Context's record leaves out its own Spaces", async () => {
    await putJson(join(root, WORK, SIDECAR_FILENAME.space), { id: 'sp_work', '<Areas>': ['Home'] })
    await putJson(join(contextsDir(root), 'Areas', 'Home', SIDECAR_FILENAME.space), {
      id: 'sp_home',
      '<Areas>': ['Work'],
    })
    await refreshTree(root)
    const r = await del(AREAS, 'context')
    if (!r.ok || !r.value.bundled) throw new Error('the delete did not trash')
    const roots = ((await recordOf(r.value.bundled.bundlePath)).membership as Raw[]).map(
      (m) => (m.root as Raw).id,
    )
    expect(roots.sort()).toEqual([await idOf(a), await idOf(b)].sort())
  })

  it('a crash between the note and the list step finishes the delete', async () => {
    const sidecar = sidecarPath(notes, 'collection')
    await putJson(sidecar, {
      ...(await readJsonAt(sidecar)),
      views: [viewOn('ctx_areas', 'sp_work')],
    })
    await putJson(contextsRegistryFile(root), { contexts: [{ id: 'ctx_areas', title: 'Areas' }] })
    await refreshTree(root)
    const bundle = await mintBundle(root, { kind: 'trash' }, join(root, AREAS))
    const bundlePath = relative(root, bundle)
    await putJson(join(root, OWED_REL), {
      ctx_areas: { kind: 'context', strip: ['Areas'], bundle: bundlePath },
    })
    await finishOwed(root, nexusDeps)
    expect((await readJsonAt(contextsRegistryFile(root))).contexts).toEqual([])
    expect(await pathExists(join(root, bundlePath, 'Areas'))).toBe(true)
    expect([await tagsOf(a), await tagsOf(b)]).toEqual([undefined, undefined])
    expect(((await readJsonAt(sidecar)).views as Raw[])[0]?.property_order).toEqual(['_title'])
    expect(await readNotes(root)).toEqual({})

    await putJson(contextsRegistryFile(root), { contexts: [{ id: 'ctx_last', title: 'Last' }] })
    await mkdir(join(contextsDir(root), 'Last'))
    await refreshTree(root)
    await putJson(join(root, OWED_REL), { ctx_last: { kind: 'context', strip: ['Last'] } })
    const trashToSystem = vi.fn(async (p: string) => rm(p, { recursive: true, force: true }))
    await finishOwed(root, { trashMode: 'system', trashToSystem })
    expect(trashToSystem).toHaveBeenCalledWith(join(contextsDir(root), 'Last'))
    expect(await readNotes(root)).toEqual({})
  })

  it("a Context delete's own Spaces aren't owed", async () => {
    await putJson(join(root, WORK, SIDECAR_FILENAME.space), { id: 'sp_work', '<Areas>': ['Home'] })
    await refreshTree(root)
    const r = await del(AREAS, 'context')
    if (!r.ok) throw new Error(r.error.message)
    expect(r.value.cascade?.owed).toBeUndefined()
    expect(await readNotes(root)).toEqual({})
  })

  it("a Space deleted while its Context owes a rename strips the holders under the Context's new title and stays owed", async () => {
    await putJson(join(contextsDir(root), 'Areas', 'Gym', SIDECAR_FILENAME.space), { id: 'sp_gym' })
    await writeFile(a, `---\nID: ${await idOf(a)}\n<Areas>:\n  - Gym\n---\nbody\n`)
    await writeFile(b, `---\nID: ${await idOf(b)}\n<Old>:\n  - Gym\n---\nbody\n`)
    await refreshTree(root)
    await putJson(join(root, OWED_REL), { ctx_areas: { kind: 'context', rename: ['Old'] } })
    const r = await del(`${AREAS}/Gym`, 'space')
    if (!r.ok) throw new Error(r.error.message)
    expect(r.value.cascade?.owed).toBe(true)
    expect(await tagsOf(a)).toBeUndefined()
    expect(await readNotes(root)).toMatchObject({
      sp_gym: { kind: 'space', contextId: 'ctx_areas', strip: ['Gym'] },
    })
    await finishOwed(root, nexusDeps)
    const fm = splitFrontmatter(await readFile(b, 'utf8'))
    expect([fm['<Old>'], fm['<Areas>']]).toEqual([undefined, undefined])
    expect(await readNotes(root)).toEqual({})
  })

  it.skipIf(noModeBits)(
    "a view settings file the delete couldn't reach keeps it owed",
    async () => {
      const other = await entity(root, 'collection', 'Other')
      const sidecar = sidecarPath(other.path, 'collection')
      await putJson(sidecar, {
        ...(await readJsonAt(sidecar)),
        views: [viewOn('ctx_areas', 'sp_work')],
      })
      await refreshTree(root)
      const r = await shut(sidecar, () => del(AREAS, 'context'))
      if (!r.ok) throw new Error(r.error.message)
      expect(r.value.cascade?.owed).toBe(true)
      expect(await readNotes(root)).toMatchObject({ ctx_areas: { strip: ['Areas'] } })
      await finishOwed(root, nexusDeps)
      const [view] = (await readJsonAt(sidecar)).views as Raw[]
      expect(view.property_order).toEqual(['_title'])
      expect(await readNotes(root)).toEqual({})
    },
  )
})

describe('a content delete on the notes', () => {
  const shut = async <T>(file: string, run: () => Promise<T>): Promise<T> => {
    await chmod(file, 0o000)
    try {
      return await run()
    } finally {
      await chmod(file, 0o644)
    }
  }
  const relatedOf = async (file: string): Promise<unknown> =>
    splitFrontmatter(await readFile(file, 'utf8')).Related

  // A Collection `Old`, and a View Tile on Home whose rule names it.
  const tiled = async (): Promise<{ old: { id: string; path: string }; tiles: string }> => {
    const old = await entity(root, 'collection', 'Old')
    const surfaces = await seedConfigSurfaces(
      root,
      notes,
      view([{ property_id: '_location', op: 'is', values: [old.id] }]),
    )
    await refreshTree(root)
    return { old, tiles: surfaces.tiles }
  }

  beforeEach(async () => {
    await addRelated()
  })

  it.skipIf(noModeBits)('a page delete that misses a linker owes it with Try Again', async () => {
    const target = await page(notes, 'Target')
    const id = await idOf(target)
    const linker = await page(notes, 'One', 'Target')
    await refreshTree(root)
    const r = await shut(linker, () =>
      handleMutate(root, { op: 'delete', path: 'Notes/Target.md', kind: 'page' }, nexusDeps),
    )
    if (!r.ok || !r.value.bundled) throw new Error('the delete did not trash')
    const { bundlePath } = r.value.bundled
    expect(r.value.cascade?.owed).toBe(true)
    expect(await readNotes(root)).toEqual({
      [id as string]: {
        kind: 'container',
        at: 'Notes/Target.md',
        strip: ['Notes/Target.md'],
        bundle: bundlePath,
      },
    })
    await finishOwed(root, nexusDeps)
    expect(await relatedOf(linker)).toBeUndefined()
    expect((await recordOf(bundlePath)).links).toContainEqual(
      expect.objectContaining({ page: await idOf(linker), value: '[[Target]]' }),
    )
    expect(await readNotes(root)).toEqual({})
  })

  it.skipIf(noModeBits)(
    'a Collection delete that misses a view settings file owes it',
    async () => {
      const { old, tiles } = await tiled()
      const r = await shut(tiles, () => del('Old', 'collection'))
      expect(r.ok && r.value.cascade?.owed).toBe(true)
      expect(JSON.stringify(await readJsonAt(tiles))).toContain(old.id)
      await finishOwed(root, nexusDeps)
      expect(JSON.stringify(await readJsonAt(tiles))).not.toContain(old.id)
      expect(await readNotes(root)).toEqual({})
    },
  )

  it("a clean delete's record carries no partial", async () => {
    await page(notes, 'Target')
    await refreshTree(root)
    const clean = await del('Notes/Target.md', 'page')
    if (!clean.ok || !clean.value.bundled) throw new Error('the delete did not trash')
    expect(await recordOf(clean.value.bundled.bundlePath)).not.toHaveProperty('partial')
  })

  it('a crash between the note and the strip finishes at the open', async () => {
    const target = await page(notes, 'Target')
    const id = (await idOf(target)) as string
    const linker = await page(notes, 'One', 'Target')
    await refreshTree(root)
    const bundle = await mintBundle(root, { kind: 'trash' }, target)
    await rename(target, join(bundle, 'Target.md'))
    await putJson(join(root, OWED_REL), {
      [id]: {
        kind: 'container',
        at: 'Notes/Target.md',
        strip: ['Notes/Target.md'],
        bundle: relative(root, bundle),
      },
    })
    await refreshTree(root)
    await finishOwed(root, nexusDeps)
    expect(await relatedOf(linker)).toBeUndefined()
    expect(await readNotes(root)).toEqual({})
  })

  it('a crash between the note and the move leaves the live page its links', async () => {
    const target = await page(notes, 'Target')
    const id = (await idOf(target)) as string
    const linker = await page(notes, 'One', 'Target')
    await refreshTree(root)
    await putJson(join(root, OWED_REL), {
      [id]: { kind: 'container', at: 'Notes/Target.md', strip: ['Notes/Target.md'] },
    })
    await finishOwed(root, nexusDeps)
    expect(await relatedOf(linker)).toBe('[[Target]]')
    expect(await readNotes(root)).toEqual({})
  })

  it.skipIf(noModeBits)(
    "a page restored before its delete's Try Again keeps every linker's link",
    async () => {
      await page(notes, 'Target')
      const one = await page(notes, 'One', 'Target')
      const two = await page(notes, 'Two', 'Target')
      await refreshTree(root)
      const deleted = await shut(two, () =>
        handleMutate(root, { op: 'delete', path: 'Notes/Target.md', kind: 'page' }, nexusDeps),
      )
      if (!deleted.ok || !deleted.value.bundled) throw new Error('the delete did not trash')
      expect(deleted.value.cascade?.owed).toBe(true)
      await refreshTree(root)
      const r = await settledMutate(
        root,
        { op: 'restore', bundlePath: deleted.value.bundled.bundlePath },
        nexusDeps,
      )
      expect(r.ok).toBe(true)
      await finishOwed(root, nexusDeps)
      expect(await relatedOf(one)).toBe('[[Target]]')
      expect(await relatedOf(two)).toBe('[[Target]]')
      expect(await readNotes(root)).toEqual({})
    },
  )

  // A Set `S` in Notes, a Collection `Other`, and a note for the Set's move from Notes into Other, its relocation not yet made.
  const setMoveNoted = async (): Promise<{ id: string; views: () => Promise<string> }> => {
    const set = await entity(notes, 'set', 'S')
    await entity(root, 'collection', 'Other')
    const colFile = sidecarPath(notes, 'collection')
    await putJson(colFile, {
      ...(await readJsonAt(colFile)),
      views: [view([{ property_id: '_location', op: 'is', values: [set.id] }])],
    })
    await putJson(join(root, OWED_REL), {
      [set.id]: {
        kind: 'container',
        at: 'Notes/S',
        edit: { kind: 'gone', propertyId: '_location', ids: [set.id] },
        within: 'Notes',
      },
    })
    return { id: set.id, views: async () => JSON.stringify((await readJsonAt(colFile)).views) }
  }

  it("a crash between a Set move's note and its relocation keeps the Set in its Collection's views", async () => {
    const { id, views } = await setMoveNoted()
    await refreshTree(root)
    await finishOwed(root, nexusDeps)
    expect(await views()).toContain(id)
    expect(await readNotes(root)).toEqual({})
  })

  it("a Set moved out before its move's finish leaves the old Collection's views", async () => {
    const { id, views } = await setMoveNoted()
    await rename(join(notes, 'S'), join(root, 'Other', 'S'))
    await refreshTree(root)
    await finishOwed(root, nexusDeps)
    expect(await views()).not.toContain(id)
    expect(await readNotes(root)).toEqual({})
  })

  it.skipIf(noModeBits)(
    "a Collection restored before its delete's Try Again keeps its views",
    async () => {
      const { old, tiles } = await tiled()
      const r = await shut(tiles, async () => {
        const deleted = await del('Old', 'collection')
        if (!deleted.ok || !deleted.value.bundled) throw new Error('the delete did not trash')
        expect(deleted.value.cascade?.owed).toBe(true)
        return settledMutate(
          root,
          { op: 'restore', bundlePath: deleted.value.bundled.bundlePath },
          nexusDeps,
        )
      })
      expect(r.ok).toBe(true)
      await finishOwed(root, nexusDeps)
      expect(JSON.stringify(await readJsonAt(tiles))).toContain(old.id)
      expect(await readNotes(root)).toEqual({})
    },
  )
})
