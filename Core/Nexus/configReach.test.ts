import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { chmod, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { noModeBits, putJson, readJsonAt, tempRoot } from '../Testing/hostFs'
import { contextsDir, contextsRegistryFile, nexusConfig, tileHostDir } from '../Paths/paths'
import { NEXUS_CONFIG_FILES, SIDECAR_FILENAME, TILE_DOC_FILENAME } from '../Paths/nexusPaths'
import type { PropertyDefinition } from '../Properties/properties'
import { dropLiveTree, heldTreeOf, liveTreeOf, refreshTree } from './liveTree'
import { readNexus } from './readNexus'
import { closeSession, openSession } from './session'
import './settle'
import { stabilize } from './treeStabilize'
import { goneEdit, propertyClear, reachConfig, reachReport } from './configReach'
import { unsweptLine } from '../Properties/governedSweep'

vi.mock('./liveTree', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./liveTree')>()
  return { ...mod, liveTreeOf: vi.fn(mod.liveTreeOf) }
})

type Raw = Record<string, unknown>

const STAGE: PropertyDefinition = {
  id: 'prop_s',
  name: 'Stage',
  type: 'select',
  select_options: [{ value: 'Done' }, { value: 'Todo' }],
}
const TAGS: PropertyDefinition = {
  id: 'prop_m',
  name: 'Tags',
  type: 'multiSelect',
  select_options: [{ value: 'A' }],
}

const rename = {
  kind: 'option' as const,
  def: STAGE,
  value: 'Done',
  edit: { op: 'replace' as const, to: 'Closed' },
}
const removal = {
  kind: 'option' as const,
  def: STAGE,
  value: 'Done',
  edit: { op: 'strip' as const },
}
const clear = { kind: 'property' as const, propertyId: 'prop_s' }

const rich = (id: string): Raw => ({
  id,
  name: id,
  type: 'table',
  property_order: ['_title', 'prop_s', 'prop_x'],
  hidden_properties: ['prop_s', 'prop_x'],
  column_widths: { prop_s: 120, prop_x: 80 },
  column_alignments: { prop_s: 'left' },
  column_styles: { prop_s: { wrap: true } },
  filter: {
    match: 'all',
    rules: [
      { property_id: 'prop_s', op: 'is', value: 'Done' },
      { match: 'any', rules: [{ property_id: 'prop_s', op: 'is_not', values: ['Done', 'Todo'] }] },
      { property_id: 'prop_s', op: 'is', value: 'Todo', values: ['Done'] },
      { property_id: 'prop_s', op: 'contains', value: 'Done' },
      { property_id: 'prop_s', op: 'is_empty' },
      { property_id: 'prop_x', op: 'is', value: 'Done' },
      null,
    ],
  },
  sort: [
    { property_id: 'prop_s', direction: 'ascending', order: ['Todo', 'Done'] },
    { property_id: 'prop_x', direction: 'ascending' },
  ],
  group: { kind: 'property', property_id: 'prop_s', order_mode: 'manual', order: ['Done', 'Todo'] },
  sub_group: { property_id: 'prop_s', order_mode: 'manual', order: ['Done'] },
  hidden_groups: ['prop_s/Done', 'sub/prop_s/Done', 'Done', 'sub/Done', 'prop_x/Done'],
  collapsed_groups: ['Done', 'set_1/Done', 'Todo'],
})

const elsewhere = (id: string): Raw => ({
  id,
  name: id,
  type: 'table',
  property_order: [],
  hidden_properties: [],
  group: { kind: 'property', property_id: 'prop_x', order_mode: 'configured' },
  hidden_groups: ['Done', 'sub/Done'],
  collapsed_groups: ['Done', 'set_1/Done'],
})

let root: string
const col = (): string => join(root, 'Notes')
const set = (): string => join(root, 'Notes', 'Deep')
const other = (): string => join(root, 'Other')
const space = (): string => join(contextsDir(root), 'Areas', 'Home')
const colFile = (): string => join(col(), SIDECAR_FILENAME.collection)
const setFile = (): string => join(set(), SIDECAR_FILENAME.set)
const spaceTiles = (): string => join(space(), TILE_DOC_FILENAME)
const homeTiles = (): string => join(tileHostDir(root), TILE_DOC_FILENAME)
const matrixFile = (): string => nexusConfig(root, NEXUS_CONFIG_FILES.matrix)

const viewsOf = async (file: string): Promise<Raw[]> => (await readJsonAt(file)).views as Raw[]
const tileViews = async (id: string): Promise<Raw[]> => {
  const tile = ((await readJsonAt(spaceTiles())).tiles as Raw[]).find((t) => t.id === id)
  return (tile?.views as Raw[]).map((v) => v.config as Raw)
}
const matrixRules = async (): Promise<unknown> =>
  ((await readJsonAt(matrixFile())).filter as Raw).rules

beforeEach(async () => {
  root = tempRoot('pom-reach-')
  await putJson(nexusConfig(root, NEXUS_CONFIG_FILES.identity), { id: 'nx', createdAt: '2026' })
  await putJson(contextsRegistryFile(root), { contexts: [{ id: 'ctx_areas', title: 'Areas' }] })
  await putJson(join(space(), SIDECAR_FILENAME.space), { id: 'sp_home' })
  await putJson(colFile(), {
    id: 'col_notes',
    properties: ['prop_s'],
    views: [rich('view_c'), elsewhere('view_e'), 'foreign'],
    property_cache: { prop_s: { values: { p1: 'Done', p2: ['Done', 'Todo'], p3: 'Todo' } } },
  })
  await putJson(setFile(), { id: 'set_deep', views: [rich('view_s')] })
  await putJson(join(other(), SIDECAR_FILENAME.collection), { id: 'col_other', views: [] })
  await putJson(spaceTiles(), {
    tiles: [
      { id: 't_deep', type: 'view', views: [{ source_id: 'set_deep', config: rich('tv_deep') }] },
      {
        id: 't_other',
        type: 'view',
        views: [{ source_id: 'col_other', config: rich('tv_other') }],
      },
    ],
  })
  await putJson(homeTiles(), { tiles: [{ id: 'm', type: 'markdown' }] })
  await putJson(matrixFile(), {
    filter: {
      rules: { match: 'all', rules: [{ property_id: 'prop_s', op: 'is', value: 'Done' }, null] },
      enabled: true,
    },
  })
})

afterEach(async () => {
  dropLiveTree()
  await rm(root, { recursive: true, force: true })
})

describe('an option rename', () => {
  it('reaches every field that holds the option on a Collection, a Set, a tile, and the Matrix', async () => {
    const reach = await reachConfig(root, rename)
    expect(reach).toEqual({ skipped: 0, hosts: [{ kind: 'space', id: 'sp_home' }] })
    for (const view of [
      (await viewsOf(colFile()))[0],
      (await viewsOf(setFile()))[0],
      (await tileViews('t_deep'))[0],
    ]) {
      expect(view.filter).toEqual({
        match: 'all',
        rules: [
          { property_id: 'prop_s', op: 'is', value: 'Closed' },
          {
            match: 'any',
            rules: [{ property_id: 'prop_s', op: 'is_not', values: ['Closed', 'Todo'] }],
          },
          { property_id: 'prop_s', op: 'is', value: 'Todo', values: ['Closed'] },
          { property_id: 'prop_s', op: 'contains', value: 'Done' },
          { property_id: 'prop_s', op: 'is_empty' },
          { property_id: 'prop_x', op: 'is', value: 'Done' },
          null,
        ],
      })
      expect((view.sort as Raw[])[0].order).toEqual(['Todo', 'Closed'])
      expect((view.group as Raw).order).toEqual(['Closed', 'Todo'])
      expect((view.sub_group as Raw).order).toEqual(['Closed'])
      expect(view.hidden_groups).toEqual(['prop_s/Closed', 'sub/prop_s/Closed', 'prop_x/Done'])
      expect(view.collapsed_groups).toEqual(['Closed', 'set_1/Closed', 'Todo'])
    }
    expect(await matrixRules()).toEqual({
      match: 'all',
      rules: [{ property_id: 'prop_s', op: 'is', value: 'Closed' }, null],
    })
    expect(((await readJsonAt(colFile())).property_cache as Raw).prop_s).toEqual({
      values: { p1: ['Closed'], p2: ['Closed', 'Todo'], p3: 'Todo' },
    })
  })

  it('leaves the keys a view holds under another grouping, and an entry it cannot read', async () => {
    await reachConfig(root, rename)
    const [, kept, foreign] = await viewsOf(colFile())
    expect(kept).toEqual(elsewhere('view_e'))
    expect(foreign).toBe('foreign')
  })

  it('edits a Multi-Select contains rule, which compares whole values', async () => {
    await putJson(setFile(), {
      id: 'set_deep',
      views: [
        {
          ...elsewhere('v'),
          filter: {
            match: 'all',
            rules: [{ property_id: 'prop_m', op: 'contains', values: ['A'] }],
          },
        },
      ],
    })
    await reachConfig(root, {
      kind: 'option',
      def: TAGS,
      value: 'A',
      edit: { op: 'replace', to: 'B' },
    })
    expect((await viewsOf(setFile()))[0].filter).toEqual({
      match: 'all',
      rules: [{ property_id: 'prop_m', op: 'contains', values: ['B'] }],
    })
  })

  it('writes nothing on a second run', async () => {
    await reachConfig(root, rename)
    const files = [colFile(), setFile(), spaceTiles(), homeTiles(), matrixFile()]
    const before = await Promise.all(files.map(async (f) => (await stat(f)).mtimeMs))
    expect(await reachConfig(root, rename)).toEqual({ skipped: 0, hosts: [] })
    expect(await Promise.all(files.map(async (f) => (await stat(f)).mtimeMs))).toEqual(before)
  })

  it('the held tree follows each container it wrote', async () => {
    await openSession(root)
    await refreshTree(root)
    await reachConfig(root, rename)
    const held = heldTreeOf(root)
    expect(stabilize(await readNexus(root), held)).toBe(held)
    closeSession()
  })
})

describe('an option removal', () => {
  it('drops a rule it leaves with no operand, or whose chip list it empties beside a value, and strips the cache', async () => {
    await reachConfig(root, removal)
    const [view] = await viewsOf(colFile())
    expect(view.filter).toEqual({
      match: 'all',
      rules: [
        { match: 'any', rules: [{ property_id: 'prop_s', op: 'is_not', values: ['Todo'] }] },
        { property_id: 'prop_s', op: 'contains', value: 'Done' },
        { property_id: 'prop_s', op: 'is_empty' },
        { property_id: 'prop_x', op: 'is', value: 'Done' },
        null,
      ],
    })
    expect(view.hidden_groups).toEqual(['prop_x/Done'])
    expect(view.collapsed_groups).toEqual(['Todo'])
    expect((view.group as Raw).order).toEqual(['Todo'])
    expect(((await readJsonAt(colFile())).property_cache as Raw).prop_s).toEqual({
      values: { p2: ['Todo'], p3: 'Todo' },
    })
    expect(await matrixRules()).toEqual({ match: 'all', rules: [null] })
  })
})

describe('a property clear', () => {
  it('removes every field that names the property', async () => {
    await reachConfig(root, clear)
    for (const view of [
      (await viewsOf(colFile()))[0],
      (await viewsOf(setFile()))[0],
      (await tileViews('t_deep'))[0],
    ]) {
      expect(view.property_order).toEqual(['_title', 'prop_x'])
      expect(view.hidden_properties).toEqual(['prop_x'])
      expect(view.column_widths).toEqual({ prop_x: 80 })
      expect(view.column_alignments).toEqual({})
      expect(view.column_styles).toEqual({})
      expect(view.filter).toEqual({
        match: 'all',
        rules: [
          { match: 'any', rules: [] },
          { property_id: 'prop_x', op: 'is', value: 'Done' },
          null,
        ],
      })
      expect(view.sort).toEqual([{ property_id: 'prop_x', direction: 'ascending' }])
      expect(view.group).toEqual({ kind: 'structural' })
      expect('sub_group' in view).toBe(false)
      expect(view.hidden_groups).toEqual(['Done', 'prop_x/Done'])
      expect(view.collapsed_groups).toEqual([])
    }
    expect(await matrixRules()).toEqual({ match: 'all', rules: [null] })
  })

  it('drops only the sub-band keys when only the sub-grouping is on the property', () => {
    const edit = propertyClear('prop_s')
    expect(
      edit({
        ...elsewhere('v'),
        group: { kind: 'structural' },
        sub_group: { property_id: 'prop_s', order_mode: 'configured' },
        collapsed_groups: ['set_1', 'set_1/Done'],
      })?.collapsed_groups,
    ).toEqual(['set_1'])
  })
})

describe('what the pass skips', () => {
  it('leaves an absent matrix.json and Space board untouched', async () => {
    await rm(matrixFile())
    await rm(spaceTiles())
    expect(await reachConfig(root, rename)).toEqual({ skipped: 0, hosts: [] })
    await expect(stat(matrixFile())).rejects.toThrow()
    await expect(stat(spaceTiles())).rejects.toThrow()
  })

  it('rebuilds a corrupt matrix.json a delete reaches and sets the damaged copy aside', async () => {
    await writeFile(matrixFile(), '{ not json')
    const gone = { kind: 'gone' as const, propertyId: '_location', ids: ['set_deep'] }
    expect(await reachConfig(root, gone)).toEqual({ skipped: 0, hosts: [] })
    expect(await readJsonAt(matrixFile())).toEqual({})
    const aside = (await readdir(join(root, '.nexus'))).filter((n) =>
      n.startsWith('.matrix.json.bad-'),
    )
    expect(aside).toHaveLength(1)
    expect(await readFile(join(root, '.nexus', aside[0]), 'utf8')).toBe('{ not json')
  })

  it('counts a directory at a Set sidecar as one skip', async () => {
    await rm(setFile())
    await mkdir(setFile())
    expect((await reachConfig(root, rename)).skipped).toBe(1)
  })

  it('counts a corrupt sidecar as one skip and leaves its bytes', async () => {
    await writeFile(setFile(), '{ not json')
    expect((await reachConfig(root, rename)).skipped).toBe(1)
    expect(await readFile(setFile(), 'utf8')).toBe('{ not json')
  })

  it.skipIf(noModeBits)(
    'counts a sidecar whose write throws and still reaches the tile after it',
    async () => {
      await chmod(set(), 0o555)
      try {
        const reach = await reachConfig(root, rename)
        expect(reach.skipped).toBe(1)
        expect((await tileViews('t_deep'))[0].hidden_groups).toEqual([
          'prop_s/Closed',
          'sub/prop_s/Closed',
          'prop_x/Done',
        ])
      } finally {
        await chmod(set(), 0o755)
      }
      expect((await viewsOf(setFile()))[0]).toEqual(rich('view_s'))
    },
  )

  it('reaches the board of a Space the walk listed as unreadable, with no host to push', async () => {
    await writeFile(join(space(), SIDECAR_FILENAME.space), '{ not json')
    expect(await reachConfig(root, rename)).toEqual({ skipped: 0, hosts: [] })
    expect((await tileViews('t_deep'))[0].hidden_groups).toEqual([
      'prop_s/Closed',
      'sub/prop_s/Closed',
      'prop_x/Done',
    ])
  })

  it('counts an unreadable Contexts registry as one skip, since no Space can be found', async () => {
    await writeFile(join(root, '.nexus', 'contexts', 'contexts.json'), '{ not json')
    expect(await reachConfig(root, rename)).toEqual({ skipped: 1, hosts: [] })
  })

  it('answers one skip and writes nothing when the walk throws', async () => {
    vi.mocked(liveTreeOf).mockRejectedValueOnce(new Error('walk failed'))
    expect(await reachConfig(root, rename)).toEqual({ skipped: 1, hosts: [] })
    expect((await viewsOf(setFile()))[0]).toEqual(rich('view_s'))
  })
})

describe('a pass scoped under one Collection', () => {
  it('edits the Collection, its Sets, and the tiles sourcing them, and leaves other sources and the Matrix', async () => {
    const reach = await reachConfig(root, clear, col())
    expect(reach).toEqual({ skipped: 0, hosts: [{ kind: 'space', id: 'sp_home' }] })
    expect((await viewsOf(colFile()))[0].group).toEqual({ kind: 'structural' })
    expect((await viewsOf(setFile()))[0].group).toEqual({ kind: 'structural' })
    expect((await tileViews('t_deep'))[0].group).toEqual({ kind: 'structural' })
    expect((await tileViews('t_other'))[0]).toEqual(rich('tv_other'))
    expect(await matrixRules()).toEqual({
      match: 'all',
      rules: [{ property_id: 'prop_s', op: 'is', value: 'Done' }, null],
    })
  })

  it('edits only the views of a tile that source the Collection', async () => {
    await putJson(spaceTiles(), {
      tiles: [
        {
          id: 't_mixed',
          type: 'view',
          views: [
            { source_id: 'set_deep', config: rich('tv_in') },
            { source_id: 'col_other', config: rich('tv_out') },
          ],
        },
      ],
    })
    await reachConfig(root, clear, col())
    const [inside, outside] = await tileViews('t_mixed')
    expect(inside.group).toEqual({ kind: 'structural' })
    expect(outside).toEqual(rich('tv_out'))
  })

  it('counts the Collection’s own unreadable sidecar', async () => {
    await rm(colFile())
    await mkdir(colFile())
    expect((await reachConfig(root, clear, col())).skipped).toBe(1)
    expect((await reachConfig(root, clear)).skipped).toBe(1)
  })
})

describe('a gone edit', () => {
  const setGone = {
    kind: 'gone' as const,
    propertyId: '_location',
    ids: ['set_gone', 'set_sub'],
  }
  const locatedRules = [
    { property_id: '_location', op: 'is', values: ['set_gone', 'set_keep'] },
    { property_id: '_location', op: 'is_inside', values: ['set_sub'] },
    { property_id: '_location', op: 'is_empty' },
    { property_id: 'prop_s', op: 'is', value: 'set_gone' },
  ]
  const strippedRules = [
    { property_id: '_location', op: 'is', values: ['set_keep'] },
    { property_id: '_location', op: 'is_empty' },
    { property_id: 'prop_s', op: 'is', value: 'set_gone' },
  ]
  const located = (id: string): Raw => ({
    id,
    name: id,
    type: 'table',
    filter: { match: 'all', rules: locatedRules },
    group_order: ['set_gone', 'set_keep', 'set_sub'],
    hidden_groups: ['set_gone', 'prop_s/Done'],
    collapsed_groups: ['set_gone', 'set_gone/Done', 'set_keep/_ungrouped', 'Done'],
  })
  const goneTile = {
    id: 't_gone',
    type: 'view',
    views: [{ source_id: 'set_gone', config: located('tv_gone') }],
  }

  beforeEach(async () => {
    await putJson(colFile(), { id: 'col_notes', views: [located('view_c')] })
    await putJson(setFile(), { id: 'set_deep', views: [located('view_s')] })
    await putJson(spaceTiles(), {
      tiles: [
        {
          id: 't_deep',
          type: 'view',
          views: [{ source_id: 'set_deep', config: located('tv_deep') }],
        },
        goneTile,
      ],
    })
    await putJson(matrixFile(), {
      filter: { rules: { match: 'all', rules: locatedRules }, enabled: true },
    })
  })

  it('strips the gone ids from Location rules and band keys on a Collection, a Set, a tile, and the Matrix', async () => {
    const reach = await reachConfig(root, setGone)
    expect(reach).toEqual({ skipped: 0, hosts: [{ kind: 'space', id: 'sp_home' }] })
    for (const view of [
      (await viewsOf(colFile()))[0],
      (await viewsOf(setFile()))[0],
      (await tileViews('t_deep'))[0],
    ]) {
      expect(view.filter).toEqual({ match: 'all', rules: strippedRules })
      expect(view.group_order).toEqual(['set_keep'])
      expect(view.hidden_groups).toEqual(['prop_s/Done'])
      expect(view.collapsed_groups).toEqual(['set_keep/_ungrouped', 'Done'])
    }
    expect(await matrixRules()).toEqual({ match: 'all', rules: strippedRules })
  })

  it('strips a gone Space from the rules on its Context, dropping one it empties, and leaves another Context', async () => {
    await putJson(setFile(), {
      id: 'set_deep',
      views: [
        {
          ...elsewhere('v'),
          filter: {
            match: 'all',
            rules: [
              { property_id: 'ctx_areas', op: 'contains_any', values: ['sp_work', 'sp_home'] },
              { property_id: 'ctx_areas', op: 'does_not_contain', values: ['sp_work'] },
              { property_id: 'ctx_other', op: 'contains_any', values: ['sp_work'] },
            ],
          },
        },
      ],
    })
    await reachConfig(root, { kind: 'gone', propertyId: 'ctx_areas', ids: ['sp_work'] })
    expect((await viewsOf(setFile()))[0].filter).toEqual({
      match: 'all',
      rules: [
        { property_id: 'ctx_areas', op: 'contains_any', values: ['sp_home'] },
        { property_id: 'ctx_other', op: 'contains_any', values: ['sp_work'] },
      ],
    })
  })

  it('leaves a tile view sourced from a gone container as written', async () => {
    await reachConfig(root, setGone)
    const tiles = (await readJsonAt(spaceTiles())).tiles as Raw[]
    expect(tiles.find((t) => t.id === 't_gone')).toEqual(goneTile)
    expect((await tileViews('t_deep'))[0].group_order).toEqual(['set_keep'])
  })

  it('writes nothing on a second run', async () => {
    await reachConfig(root, setGone)
    const files = [colFile(), setFile(), spaceTiles(), homeTiles(), matrixFile()]
    const before = await Promise.all(files.map(async (f) => (await stat(f)).mtimeMs))
    expect(await reachConfig(root, setGone)).toEqual({ skipped: 0, hosts: [] })
    expect(await Promise.all(files.map(async (f) => (await stat(f)).mtimeMs))).toEqual(before)
  })

  it('matches a gone id whole or as the head of a key, whatever the id holds', async () => {
    await putJson(colFile(), {
      id: 'col_notes',
      views: [
        {
          id: 'v',
          name: 'v',
          type: 'table',
          group_order: ['odd/id', 'odd/idx'],
          collapsed_groups: ['odd/id/Done'],
        },
      ],
    })
    await reachConfig(root, { kind: 'gone', propertyId: '_location', ids: ['odd/id'] })
    const [view] = await viewsOf(colFile())
    expect(view.group_order).toEqual(['odd/idx'])
    expect(view.collapsed_groups).toEqual([])
  })

  it('reports a pass as a cascade, carrying a warning only for a skip', () => {
    expect(reachReport({ skipped: 2, hosts: [] })).toEqual({
      pages: [],
      hosts: [],
      warning: unsweptLine(2),
    })
    expect('warning' in reachReport({ skipped: 0, hosts: [] })).toBe(false)
  })

  it('reads the edit a delete owes from the tree', async () => {
    const tree = await liveTreeOf(root)
    expect(goneEdit(tree, 'context', '.nexus/contexts/Areas')).toEqual({
      kind: 'property',
      propertyId: 'ctx_areas',
    })
    expect(goneEdit(tree, 'space', '.nexus/contexts/Areas/Home')).toEqual({
      kind: 'gone',
      propertyId: 'ctx_areas',
      ids: ['sp_home'],
    })
    expect(goneEdit(tree, 'collection', 'Notes')).toEqual({
      kind: 'gone',
      propertyId: '_location',
      ids: ['col_notes', 'set_deep'],
    })
    expect(goneEdit(tree, 'set', 'Notes/Deep')).toEqual({
      kind: 'gone',
      propertyId: '_location',
      ids: ['set_deep'],
    })
    expect(goneEdit(tree, 'page', 'Notes/Page.md')).toBeNull()
    expect(goneEdit(tree, 'set', 'Missing')).toBeNull()
  })
})
