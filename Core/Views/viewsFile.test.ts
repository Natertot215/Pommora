import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rm, writeFile } from 'node:fs/promises'
import { join } from '../Paths/posix'
import { tempRoot, readJsonAt } from '../Testing/hostFs'
import { savedView, type SavedView } from './views'
import {
  saveView,
  reorderViews,
  deleteView,
  duplicateView,
  readStoredView,
  restoreView,
  setActiveView,
} from './viewsFile'
import { containerFieldsFrom } from '../Nexus/containerFields'

const upsert = (folder: string, kind: 'collection' | 'set', v: SavedView) =>
  saveView(folder, kind, v, v)

let folder: string
beforeEach(async () => {
  folder = tempRoot('pom-views-crud-')
})
afterEach(async () => {
  await rm(folder, { recursive: true, force: true })
})

const view = (over: Partial<SavedView> & { id: string }): SavedView => ({
  name: 'V',
  type: 'table',
  property_order: [],
  hidden_properties: [],
  ...over,
})

// Write a collection sidecar directly so foreign keys are controllable.
async function writeCollectionSidecar(obj: Record<string, unknown>): Promise<void> {
  await writeFile(join(folder, '_pagecollection.json'), JSON.stringify({ id: 'col', ...obj }))
}
async function readRaw(file: string): Promise<Record<string, unknown>> {
  return await readJsonAt(join(folder, file))
}

describe('view persistence CRUD', () => {
  it('upserts a view and round-trips it', async () => {
    await writeCollectionSidecar({ views: [] })
    const r = await upsert(folder, 'collection', view({ id: 'view_1', name: 'Table' }))
    expect(r.ok).toBe(true)
    const sidecar = await readRaw('_pagecollection.json')
    expect((sidecar.views as SavedView[]).map((v) => v.id)).toEqual(['view_1'])
  })

  it('swaps the view_default sentinel for a real view_<ulid> on save', async () => {
    await writeCollectionSidecar({ views: [] })
    const r = await upsert(folder, 'collection', view({ id: 'view_default', name: 'Table' }))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.id).not.toBe('view_default')
    expect(r.value.id).toMatch(/^view_[0-9A-HJKMNP-TV-Z]{26}$/)
    const sidecar = await readRaw('_pagecollection.json')
    expect((sidecar.views as SavedView[])[0].id).toBe(r.value.id)
  })

  it('preserves a foreign top-level key + a foreign key on an untouched view', async () => {
    await writeCollectionSidecar({
      plugin_top: 'keep-top',
      views: [
        {
          id: 'view_keep',
          name: 'Keep',
          type: 'table',
          property_order: [],
          hidden_properties: [],
          _plugin: 'keep-view',
        },
      ],
    })
    const r = await upsert(folder, 'collection', view({ id: 'view_new', name: 'New' }))
    expect(r.ok).toBe(true)
    const sidecar = await readRaw('_pagecollection.json')
    expect(sidecar.plugin_top).toBe('keep-top')
    const keep = (sidecar.views as Record<string, unknown>[]).find((v) => v.id === 'view_keep')
    expect(keep?._plugin).toBe('keep-view')
  })

  it('lands a patch on the stored view, so a stale sender reverts nothing it left alone', async () => {
    await writeCollectionSidecar({ views: [view({ id: 'a', name: 'Renamed', type: 'cards' })] })
    await saveView(folder, 'collection', view({ id: 'a', name: 'Old' }), { hide_borders: true })
    const [stored] = (await readRaw('_pagecollection.json')).views as SavedView[]
    expect(stored).toMatchObject({ name: 'Renamed', type: 'cards', hide_borders: true })
  })

  it('a patch that clears a field removes it from the stored view', async () => {
    await writeCollectionSidecar({ views: [view({ id: 'a', card_size: 1.2 })] })
    await saveView(folder, 'collection', view({ id: 'a' }), { card_size: undefined })
    const [stored] = (await readRaw('_pagecollection.json')).views as SavedView[]
    expect('card_size' in stored).toBe(false)
  })

  it('lands a placeholder save on the first view, so racing first saves make one view', async () => {
    await writeCollectionSidecar({})
    const first = await upsert(folder, 'collection', view({ id: 'view_default', name: 'A' }))
    const second = await upsert(
      folder,
      'collection',
      view({ id: 'view_default', name: 'A', collapsed_groups: ['g1'] }),
    )
    expect(first.ok && second.ok && second.value.id === first.value.id).toBe(true)
    const views = (await readRaw('_pagecollection.json')).views as SavedView[]
    expect(views).toHaveLength(1)
    expect(views[0].collapsed_groups).toEqual(['g1'])
  })

  it('appends a placeholder save beside a view it cannot read, leaving that view as stored', async () => {
    const unreadable = 'hand-edited'
    await writeCollectionSidecar({ views: [unreadable] })
    await upsert(folder, 'collection', view({ id: 'view_default', name: 'A' }))
    const views = (await readRaw('_pagecollection.json')).views as unknown[]
    expect(views).toHaveLength(2)
    expect(views[0]).toEqual(unreadable)
  })

  it('reorders views by id, keeping unnamed views at the end', async () => {
    await writeCollectionSidecar({
      views: [view({ id: 'a' }), view({ id: 'b' }), view({ id: 'c' })],
    })
    await reorderViews(folder, 'collection', ['c', 'a'])
    const sidecar = await readRaw('_pagecollection.json')
    expect((sidecar.views as SavedView[]).map((v) => v.id)).toEqual(['c', 'a', 'b'])
  })

  it('deletes a view but refuses to remove the last one', async () => {
    await writeCollectionSidecar({ views: [view({ id: 'a' }), view({ id: 'b' })] })
    expect((await deleteView(folder, 'collection', 'a')).ok).toBe(true)
    expect((await readRaw('_pagecollection.json')).views).toHaveLength(1)
    const last = await deleteView(folder, 'collection', 'b')
    expect(last.ok).toBe(false)
    if (!last.ok) expect(last.error.code).toBe('operation-failed')
  })

  it("a delete's Undo puts the view back at its index with its configuration intact", async () => {
    const b = view({
      id: 'b',
      type: 'cards',
      hidden_properties: ['prop_x'],
      sort: [{ property_id: '_title', direction: 'descending' }],
    })
    const views = [view({ id: 'a' }), b, view({ id: 'c' })]
    await writeCollectionSidecar({ views })
    const removed = await deleteView(folder, 'collection', 'b')
    if (!removed.ok) throw new Error('delete refused')
    expect((await restoreView(folder, 'collection', removed.value)).ok).toBe(true)
    expect((await readRaw('_pagecollection.json')).views).toEqual(views)
  })

  it("a delete's Undo re-selects the view it took away, and refuses a second restore", async () => {
    await writeCollectionSidecar({
      views: [view({ id: 'a' }), view({ id: 'b' })],
      active_view: 'b',
    })
    const removed = await deleteView(folder, 'collection', 'b')
    if (!removed.ok) throw new Error('delete refused')
    await restoreView(folder, 'collection', removed.value)
    expect((await readRaw('_pagecollection.json')).active_view).toBe('b')
    expect((await restoreView(folder, 'collection', removed.value)).ok).toBe(false)
  })

  it('drops active_view when it named the deleted view, and keeps it otherwise', async () => {
    await writeCollectionSidecar({
      views: [view({ id: 'a' }), view({ id: 'b' })],
      active_view: 'a',
    })
    expect((await deleteView(folder, 'collection', 'a')).ok).toBe(true)
    expect('active_view' in (await readRaw('_pagecollection.json'))).toBe(false)

    await writeCollectionSidecar({
      views: [view({ id: 'a' }), view({ id: 'b' })],
      active_view: 'b',
    })
    expect((await deleteView(folder, 'collection', 'a')).ok).toBe(true)
    expect((await readRaw('_pagecollection.json')).active_view).toBe('b')
  })

  it('writes no modified_at through save, reorder, or delete', async () => {
    await writeCollectionSidecar({ views: [view({ id: 'a' })] })
    expect((await upsert(folder, 'collection', view({ id: 'b' }))).ok).toBe(true)
    expect((await reorderViews(folder, 'collection', ['b', 'a'])).ok).toBe(true)
    expect((await deleteView(folder, 'collection', 'a')).ok).toBe(true)
    const sidecar = await readRaw('_pagecollection.json')
    expect((sidecar.views as SavedView[]).map((v) => v.id)).toEqual(['b'])
    expect('modified_at' in sidecar).toBe(false)
  })

  it('leaves a legacy modified_at in place as a foreign key', async () => {
    await writeCollectionSidecar({ views: [], modified_at: '2020-01-01T00:00:00.000Z' })
    expect((await upsert(folder, 'collection', view({ id: 'a' }))).ok).toBe(true)
    expect((await readRaw('_pagecollection.json')).modified_at).toBe('2020-01-01T00:00:00.000Z')
  })

  it('writes Set views into the _pageset.json sidecar', async () => {
    await writeFile(join(folder, '_pageset.json'), JSON.stringify({ id: 'set', views: [] }))
    const r = await upsert(folder, 'set', view({ id: 'view_s', name: 'SetTable' }))
    expect(r.ok).toBe(true)
    const sidecar = await readJsonAt<{ views: SavedView[] }>(join(folder, '_pageset.json'))
    expect(sidecar.views.map((v) => v.id)).toEqual(['view_s'])
  })
})

describe('container writes keep what this build does not decode', () => {
  const gantt = {
    id: 'view_gantt',
    name: 'Timeline',
    type: 'gantt',
    format: 'compact-v2',
    property_order: [],
    hidden_properties: [],
  }
  const raw = { open_in: 'side-peek', plugin_top: { keep: 1 } }

  it('a view save, a page reorder, and a property assign leave every other key as written', async () => {
    const { setChildOrder } = await import('../Nexus/reorder')
    const { assignProperty } = await import('../Properties/assignment')
    await writeCollectionSidecar({ ...raw, views: [gantt, view({ id: 'view_t' })] })
    expect((await upsert(folder, 'collection', view({ id: 'view_t', name: 'Renamed' }))).ok).toBe(
      true,
    )
    expect((await setChildOrder(folder, 'page_order', ['p2', 'p1'])).ok).toBe(true)
    expect((await assignProperty(folder, folder, 'prop_x')).ok).toBe(true)
    const after = await readRaw('_pagecollection.json')
    expect(after).toMatchObject({ ...raw, page_order: ['p2', 'p1'], properties: ['prop_x'] })
    expect((after.views as unknown[])[0]).toEqual(gantt)
    expect((after.views as SavedView[])[1].name).toBe('Renamed')
  })

  it('a view whose sort direction this build does not know blocks no write in its container', async () => {
    const { setChildOrder } = await import('../Nexus/reorder')
    const sideways = view({ id: 'view_s' }) as unknown as Record<string, unknown>
    sideways.sort = [{ property_id: 'p', direction: 'sideways' }]
    await writeCollectionSidecar({ views: [sideways, view({ id: 'view_t' })] })
    expect((await setChildOrder(folder, 'page_order', ['p1'])).ok).toBe(true)
    expect((await upsert(folder, 'collection', view({ id: 'view_t', name: 'T2' }))).ok).toBe(true)
    expect((await deleteView(folder, 'collection', 'view_t')).ok).toBe(true)
    const after = await readRaw('_pagecollection.json')
    expect(after.page_order).toEqual(['p1'])
    expect(after.views).toEqual([sideways])
  })
})

describe('the saved view', () => {
  it('keeps its own values this build does not recognize, and takes every key the save changed', async () => {
    const stored = {
      id: 'view_k',
      name: 'Board',
      type: 'kanban',
      property_order: [],
      hidden_properties: [],
      card_banner: 'poster',
      wrap_titles: true,
      plugin_key: { keep: 1 },
    }
    await writeCollectionSidecar({ views: [stored] })
    const { wrap_titles: _cleared, ...shown } = savedView.parse(stored)
    expect(
      (await upsert(folder, 'collection', { ...shown, name: 'Lanes', wrap_titles: undefined })).ok,
    ).toBe(true)
    const after = await readRaw('_pagecollection.json')
    expect(after.views).toEqual([
      {
        id: 'view_k',
        name: 'Lanes',
        type: 'kanban',
        property_order: [],
        hidden_properties: [],
        card_banner: 'poster',
        plugin_key: { keep: 1 },
      },
    ])
  })
})

describe('a view without an id of its own', () => {
  const stored = [
    { name: 'A', type: 'table', property_order: [], hidden_properties: [] },
    { id: 'view_x', name: 'B', type: 'table', property_order: [], hidden_properties: [] },
    { id: 'view_x', name: 'C', type: 'table', property_order: [], hidden_properties: [] },
  ]
  const MINTED = /^view_[0-9A-HJKMNP-TV-Z]{26}$/
  const shown = () => containerFieldsFrom({ views: stored }, [], []).views ?? []
  const onDisk = async () => (await readRaw('_pagecollection.json')) as Record<string, unknown>
  const named = async () => ((await onDisk()).views as SavedView[]).map((v) => v.name)

  it('reads under a positional id no sibling holds, a repeated id included', () => {
    expect(shown().map((v) => v.id)).toEqual(['view_0', 'view_x', 'view_2'])
  })

  it('takes a minted id in place on the first write, as does every view without one, and the selection follows', async () => {
    await writeCollectionSidecar({ views: stored, active_view: 'view_2' })
    const r = await upsert(folder, 'collection', { ...shown()[0], name: 'A2' })
    const after = await onDisk()
    const views = after.views as SavedView[]
    expect(views.map((v) => v.name)).toEqual(['A2', 'B', 'C'])
    expect(views[0].id).toMatch(MINTED)
    expect(views[1].id).toBe('view_x')
    expect(views[2].id).toMatch(MINTED)
    expect(r.ok && r.value.id).toBe(views[0].id)
    expect(after.active_view).toBe(views[2].id)
  })

  it('lands a second save under the same positional id on the view the first repaired', async () => {
    await writeCollectionSidecar({ views: stored })
    const [a] = shown()
    await upsert(folder, 'collection', { ...a, collapsed_groups: ['g1'] })
    await upsert(folder, 'collection', { ...a, collapsed_groups: ['g1', 'g2'] })
    const views = (await onDisk()).views as SavedView[]
    expect(views.map((v) => v.name)).toEqual(['A', 'B', 'C'])
    expect(views[0].collapsed_groups).toEqual(['g1', 'g2'])
  })

  it('restores a deleted view without landing on the sibling that moved into its place', async () => {
    await writeCollectionSidecar({ views: stored })
    const [a] = shown()
    expect((await deleteView(folder, 'collection', a.id)).ok).toBe(true)
    await upsert(folder, 'collection', a)
    expect(await named()).toEqual(['B', 'C', 'A'])
    expect(((await onDisk()).views as SavedView[])[2].id).toMatch(MINTED)
  })

  it('selects, reorders, and deletes by the id it reads under', async () => {
    await writeCollectionSidecar({ views: stored })
    await setActiveView(folder, 'collection', 'view_0')
    const selected = await onDisk()
    expect(selected.active_view).toBe((selected.views as SavedView[])[0].id)
    expect((await reorderViews(folder, 'collection', ['view_2', 'view_0', 'view_x'])).ok).toBe(true)
    expect(await named()).toEqual(['C', 'A', 'B'])
    expect((await deleteView(folder, 'collection', 'view_2')).ok).toBe(true)
    expect(await named()).toEqual(['A', 'B'])
  })
})

describe('a duplicated view', () => {
  it('copies the stored view whole, under a new id and a free name, right after its original', async () => {
    const stored = {
      id: 'view_a',
      name: 'Board',
      type: 'cards',
      card_banner: 'poster',
      column_styles: { p1: { look: 'chips' } },
      group: { kind: 'property', property_id: 'p1', swimlanes: true },
      filter: { match: 'all', rules: [{ property_id: 'p1', op: 'is', value: 'x', negate: true }] },
    }
    await writeCollectionSidecar({ views: [stored, { id: 'view_b', name: 'Other' }] })
    expect((await duplicateView(folder, 'collection', 'view_a')).ok).toBe(true)
    const views = (await readRaw('_pagecollection.json')).views as Array<Record<string, unknown>>
    const copy = views[1].id
    expect(views.map((v) => v.id)).toEqual(['view_a', copy, 'view_b'])
    expect(copy).not.toBe('view_a')
    expect(views[1]).toEqual({ ...stored, id: copy, name: 'Board (2)' })
  })

  it('refuses a view the container does not hold', async () => {
    await writeCollectionSidecar({ views: [{ id: 'view_a', name: 'A' }] })
    const r = await duplicateView(folder, 'collection', 'view_gone')
    expect(r.ok).toBe(false)
  })

  it('reads a view under the positional id a repair replaced', async () => {
    await writeCollectionSidecar({ views: [{ name: 'Loose', plugin: 1 }] })
    expect(await readStoredView(folder, 'collection', 'view_0')).toEqual({
      name: 'Loose',
      plugin: 1,
    })
    await setActiveView(folder, 'collection', 'view_0')
    expect(await readStoredView(folder, 'collection', 'view_0')).toMatchObject({ plugin: 1 })
  })
})
