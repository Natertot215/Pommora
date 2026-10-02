import { applyEvents } from '../Nexus/fileEvents'
import { flush } from '../Nexus/settle'
import { chmod, copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { newContentId } from '../Nexus/ids'
import { join } from '../Paths/posix'
import { noModeBits, putJson, readJsonAt, tempRoot } from '../Testing/hostFs'
import { type ConfigSurfaces, seedConfigSurfaces, viewOn } from '../Testing/configSurfaces'
import { settledMutate } from '../Testing/settledMutate'
import { createFolderEntity } from '../Nexus/folderEntity'
import { createPage } from '../Nexus/page'
import { splitFrontmatter } from '../Files/pageFile'
import type { PropertyDefinition } from '../Properties/properties'
import { dropLiveTree, refreshTree } from '../Nexus/liveTree'
import { closeSession, openSession } from '../Nexus/session'
import type { HeldKind } from '../Nexus/entities'
import { contextsDir, contextsRegistryFile, nexusConfig, sidecarPath } from '../Paths/paths'
import { NEXUS_CONFIG_FILES, SIDECAR_FILENAME } from '../Paths/nexusPaths'
import { unsweptLine } from '../Properties/governedSweep'
import type { FilterGroup } from '../Views/views'
import { filterSeeds } from '../Views/Pipeline/creationSeeds'
import type { TrashDeps } from './bundle'

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
  const made = await createFolderEntity(parent, kind, name)
  if (!made.ok) throw new Error(`${name} failed`)
  return made.value
}

const addWork = (): Promise<void> =>
  putJson(join(contextsDir(root), 'Areas', 'Work', SIDECAR_FILENAME.space), { id: 'sp_work' })

const RELATED = { id: 'prop_related', name: 'Related', type: 'link' } as PropertyDefinition

const addRelated = (): Promise<void> =>
  putJson(nexusConfig(root, NEXUS_CONFIG_FILES.properties), {
    order: [RELATED.id],
    defs: { [RELATED.id]: RELATED },
  })

const page = async (parent: string, name: string, links?: string): Promise<string> => {
  const made = await createPage(parent, name, {
    values: links ? [{ def: RELATED, value: { kind: 'link', value: `[[${links}]]` } }] : [],
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
    if (!r.ok || !r.value.trashed) throw new Error('the delete did not trash')
    expect(r.value.cascade?.pages ?? []).toEqual([])
    expect((await recordOf(r.value.trashed.bundlePath)).links ?? []).toEqual([])
    expect(await readFile(loose, 'utf8')).toBe(content)
  })

  it('leaves two linkers sharing one ID as they were, since a restore couldn’t tell them apart', async () => {
    const twin = await page(notes, 'Twin', 'Target')
    await copyFile(twin, join(notes, 'Twin copy.md'))
    await refreshTree(root)
    const r = await del('Notes/Target.md', 'page')
    if (!r.ok || !r.value.trashed) throw new Error('the delete did not trash')
    expect(r.value.cascade).toEqual({
      pages: [],
      hosts: [],
      warning: unsweptLine(2, 'links in '),
    })
    expect(splitFrontmatter(await readFile(twin, 'utf8')).Related).toBe('[[Target]]')
    expect(await recordOf(r.value.trashed.bundlePath)).toMatchObject({ partial: true })
    expect((await recordOf(r.value.trashed.bundlePath)).links).toBeUndefined()
  })

  it('replies with an empty report when nothing links it', async () => {
    await refreshTree(root)
    const r = await del('Notes/Target.md', 'page')
    expect(r.ok && r.value.cascade).toEqual({ pages: [], hosts: [] })
  })
})

describe('a Space delete', () => {
  it('strips the Space from the rules on its Context in every view, tile, and the Matrix', async () => {
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
      hosts: [{ kind: 'space', id: 'sp_home' }],
    })
    const kept = {
      match: 'all',
      rules: [{ property_id: 'ctx_areas', op: 'contains_any', values: ['sp_home'] }],
    }
    const v = await surfaces.read()
    expect([v.collection.filter, v.set.filter, v.tile.filter, v.matrix]).toEqual([
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
    const seeds = filterSeeds(collection.filter as FilterGroup, true, [], ['ctx_areas'])
    const r = await settledMutate(
      root,
      { op: 'createPage', id: newContentId('page'), parentPath: 'Notes', name: 'Fresh', seeds },
      nexusDeps,
    )
    expect(r.ok ? 'created' : r.error.message).toBe('created')
  })
})

describe('a Context delete', () => {
  it('clears the Context from every view and tile, and its rule from the Matrix', async () => {
    const held = view([{ property_id: 'ctx_projects', op: 'contains_any', values: ['sp_x'] }], {
      property_order: ['_title', 'ctx_projects'],
      hidden_properties: ['ctx_projects'],
      column_widths: { ctx_projects: 90 },
      sort: [{ property_id: 'ctx_projects', direction: 'ascending' }],
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
      filter: { match: 'all', rules: [] },
      sort: [],
    }
    const v = await surfaces.read()
    expect([v.collection, v.set, v.tile]).toEqual([cleared, cleared, cleared])
    expect(v.matrix).toEqual({ match: 'all', rules: [] })
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
    const bundlePath = r.ok ? r.value.trashed?.bundlePath : undefined
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
      hosts: [{ kind: 'space', id: 'sp_home' }],
    })
    const v = await surfaces.read()
    expect([v.collection, v.set, v.tile]).toEqual([stripped, stripped, stripped])
    expect(v.matrix).toEqual(stripped.filter)
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
    expect(r.ok && r.value.trashed).toBeUndefined()
    expect(r.ok && r.value.cascade?.hosts).toEqual([{ kind: 'space', id: 'sp_home' }])
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
    if (!r.ok || !r.value.trashed) throw new Error('the delete did not trash')
    r.value.cascade?.pages.sort()
    expect(r.value.cascade).toEqual({
      pages: ['Notes/Far.md', 'Notes/Outside.md'],
      hosts: [{ kind: 'space', id: 'sp_home' }],
    })
    expect(
      await readFile(join(root, r.value.trashed.bundlePath, 'Gone', 'Inside.md'), 'utf8'),
    ).toBe(held)
    expect((await recordOf(r.value.trashed.bundlePath)).links).toEqual(
      expect.arrayContaining([
        { page: await idOf(outside), property: 'prop_related', value: '[[Inner]]' },
        { page: await idOf(far), property: 'prop_related', value: '[[Deep]]' },
      ]),
    )
  })

  it.skipIf(noModeBits)('joins the strip’s warning and the pass’s in one line', async () => {
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
      { event: 'unlink', absPath: otherFile },
      { event: 'addDir', absPath: otherFile },
    ])
    await flush({ push: () => {}, watch: async () => {} }, root)
    await chmod(locked.path, 0o555)
    try {
      const r = await del('Notes/Gone', 'set')
      if (!r.ok || !r.value.trashed) throw new Error('the delete did not trash')
      expect(r.value.cascade?.warning).toBe(`${unsweptLine(1, 'links in ')} ${unsweptLine(1)}`)
      expect((await recordOf(r.value.trashed.bundlePath)).partial).toBe(true)
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
      { event: 'unlink', absPath: otherFile },
      { event: 'addDir', absPath: otherFile },
    ])
    await flush({ push: () => {}, watch: async () => {} }, root)
    const r = await del('Notes/Gone', 'set')
    expect(r.ok && r.value.cascade?.warning).toBe(unsweptLine(1))
  })
})

describe('a Collection delete', () => {
  it('strips it and its Sets from the Matrix and leaves the surviving Collection', async () => {
    const surfaces = await seedConfigSurfaces(root, notes, viewOn('prop_s', 'Done'))
    const deep = (await readJsonAt(sidecarPath(surfaces.set, 'set'))).id
    const old = await entity(root, 'collection', 'Old')
    const oldSet = await entity(old.path, 'set', 'OldSet')
    const matrix = nexusConfig(root, NEXUS_CONFIG_FILES.matrix)
    const locatedRule = (values: unknown[]) => ({
      match: 'all',
      rules: [{ property_id: '_location', op: 'is', values }],
    })
    await putJson(matrix, {
      filter: { rules: locatedRule([old.id, oldSet.id, deep]), enabled: true },
    })
    await refreshTree(root)
    const before = await surfaces.read()
    expect((await del('Old', 'collection')).ok).toBe(true)
    const after = await surfaces.read()
    expect(after.matrix).toEqual(locatedRule([deep]))
    expect({ ...after, matrix: null }).toEqual({ ...before, matrix: null })
  })
})
