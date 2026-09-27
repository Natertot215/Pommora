import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { join } from '../Paths/posix'
import { tempRoot } from '../Testing/hostFs'
import { type ConfigSurfaces, seedConfigSurfaces, viewOn } from '../Testing/configSurfaces'
import { confirmedMutate } from '../Testing/confirmedMutate'
import { createFolderEntity } from '../Nexus/folderEntity'
import { dropLiveTree, refreshTree } from '../Nexus/liveTree'
import { closeSession, openSession } from '../Nexus/session'
import type { MutableKind } from '../Nexus/mutateRequest'
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

const json = async (file: string): Promise<Raw> => JSON.parse(await readFile(file, 'utf8'))
const put = async (file: string, value: unknown): Promise<void> => {
  await mkdir(join(file, '..'), { recursive: true })
  await writeFile(file, JSON.stringify(value, null, 2))
}

const view = (rules: unknown[], extra: Raw = {}): Raw => ({
  id: 'view_1',
  name: 'V',
  type: 'table',
  filter: { match: 'all', rules },
  ...extra,
})

const del = (path: string, kind: MutableKind) =>
  confirmedMutate(root, { op: 'delete', path, kind }, nexusDeps)

const setOf = async (parent: string, name: string): Promise<{ id: string; path: string }> => {
  const made = await createFolderEntity(parent, 'set', name)
  if (!made.ok) throw new Error(`${name} failed`)
  return made.value
}

const addWork = (): Promise<void> =>
  put(join(contextsDir(root), 'Areas', 'Work', SIDECAR_FILENAME.space), { id: 'sp_work' })

beforeEach(async () => {
  root = tempRoot('pom-delete-reach-')
  await put(nexusConfig(root, NEXUS_CONFIG_FILES.identity), { id: 'nx', createdAt: '2026' })
  const made = await createFolderEntity(root, 'collection', 'Notes')
  if (!made.ok) throw new Error('Notes failed')
  notes = made.value.path
  await openSession(root)
})

afterEach(async () => {
  dropLiveTree()
  closeSession()
  await rm(root, { recursive: true, force: true })
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
    const r = await confirmedMutate(
      root,
      { op: 'createPage', parentPath: 'Notes', name: 'Fresh', seeds },
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
    await put(contextsRegistryFile(root), {
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

  beforeEach(async () => {
    gone = await setOf(notes, 'Gone')
    const sub = await setOf(gone.path, 'Sub')
    const keep = await setOf(notes, 'Keep')
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
    await put(goneFile, { ...(await json(goneFile)), views: [located] })
    goneSidecar = await readFile(goneFile, 'utf8')
    goneTile = { id: 'u', type: 'view', views: [{ source_id: gone.id, config: located }] }
    const board = await json(surfaces.tiles)
    await put(surfaces.tiles, { tiles: [...(board.tiles as Raw[]), goneTile] })
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
    expect(((await json(surfaces.tiles)).tiles as Raw[])[1]).toEqual(goneTile)
  })

  it('leaves the trashed copy of its own sidecar byte-identical', async () => {
    const r = await del('Notes/Gone', 'set')
    const bundlePath = r.ok ? r.value.trashed?.bundlePath : undefined
    if (!bundlePath) throw new Error('the delete did not trash')
    expect(await readFile(join(root, bundlePath, 'Gone', SIDECAR_FILENAME.set), 'utf8')).toBe(
      goneSidecar,
    )
  })

  it('restores the Set with its own views and none of the configuration that named it', async () => {
    const r = await del('Notes/Gone', 'set')
    const bundlePath = r.ok ? r.value.trashed?.bundlePath : undefined
    if (!bundlePath) throw new Error('the delete did not trash')
    expect((await confirmedMutate(root, { op: 'restore', bundlePath }, nexusDeps)).ok).toBe(true)
    expect((await json(sidecarPath(gone.path, 'set'))).views).toEqual([located])
    expect((await surfaces.read()).collection).toEqual(stripped)
  })

  it('lands and warns when the pass can’t read a sidecar', async () => {
    const other = await createFolderEntity(root, 'collection', 'Other')
    if (!other.ok) throw new Error('Other failed')
    await refreshTree(root)
    const otherFile = sidecarPath(other.value.path, 'collection')
    await rm(otherFile)
    await mkdir(otherFile)
    const r = await del('Notes/Gone', 'set')
    expect(r.ok && r.value.cascade?.warning).toBe(unsweptLine(1))
  })
})

describe('a Collection delete', () => {
  it('strips it and its Sets from the Matrix and leaves the surviving Collection', async () => {
    const surfaces = await seedConfigSurfaces(root, notes, viewOn('prop_s', 'Done'))
    const deep = (await json(sidecarPath(surfaces.set, 'set'))).id
    const old = await createFolderEntity(root, 'collection', 'Old')
    if (!old.ok) throw new Error('Old failed')
    const oldSet = await setOf(old.value.path, 'OldSet')
    const matrix = nexusConfig(root, NEXUS_CONFIG_FILES.matrix)
    const locatedRule = (values: unknown[]) => ({
      match: 'all',
      rules: [{ property_id: '_location', op: 'is', values }],
    })
    await put(matrix, {
      filter: { rules: locatedRule([old.value.id, oldSet.id, deep]), enabled: true },
    })
    await refreshTree(root)
    const before = await surfaces.read()
    expect((await del('Old', 'collection')).ok).toBe(true)
    const after = await surfaces.read()
    expect(after.matrix).toEqual(locatedRule([deep]))
    expect({ ...after, matrix: null }).toEqual({ ...before, matrix: null })
  })
})
