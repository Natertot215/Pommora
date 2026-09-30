import { describe, expect, it, vi } from 'vitest'
import { ok, fault } from '../../Contract/result'
import type { SetNode } from '../../Nexus/tree'
import type { PropertyDefinition } from '../../Properties/properties'
import type { SavedView } from '../views'
import { type BandScope, type BucketRef, routeBandDrop, runBandEffect } from './bandRouter'
import { setIndexOf } from '../Pipeline/setIndex'
import { groupPlan } from '../Pipeline/group'

const set = (id: string, path: string, sets: SetNode[] = []): SetNode => ({
  kind: 'set',
  id,
  title: id,
  path,
  pages: [],
  sets,
})
const source = set('col', 'Col', [
  set('sA', 'Col/A', [set('sA1', 'Col/A/A1'), set('sA2', 'Col/A/A2')]),
  set('sB', 'Col/B'),
])
const statusDef: PropertyDefinition = {
  id: 'prop_status',
  name: 'Status',
  type: 'status',
  status_groups: [
    { id: 'todo', label: 'To Do', color: 'gray', options: [{ value: 'open', group_id: 'todo' }] },
    {
      id: 'doing',
      label: 'Doing',
      color: 'blue',
      options: [
        { value: 'active', group_id: 'doing' },
        { value: 'review', group_id: 'doing' },
      ],
    },
    { id: 'done', label: 'Done', color: 'green', options: [{ value: 'closed', group_id: 'done' }] },
  ],
}
const view = (patch: Partial<SavedView> = {}): SavedView =>
  ({
    id: 'v',
    name: 'V',
    type: 'table',
    property_order: [],
    hidden_properties: [],
    ...patch,
  }) as SavedView
const LOCATION = view({ structural_order_mode: 'location' })
const scope = ({ view: v = LOCATION, ...patch }: Partial<BandScope> = {}): BandScope => ({
  view: v,
  plan: groupPlan(v, [statusDef], true),
  schema: [statusDef],
  sets: setIndexOf(source),
  sourcePath: 'Col',
  valueAt: (key) => key?.split('/').at(-1) ?? null,
  shown: [],
  ...patch,
})
const setRef = (key: string, parentKey: string | null, depth = parentKey ? 1 : 0) =>
  ({ kind: 'set', key, depth, parentKey }) as const
const bucket = (value: string, parentKey: string | null = null): BucketRef => ({
  kind: 'bucket',
  key: parentKey ? `${parentKey}/${value}` : value,
  depth: parentKey ? 1 : 0,
  parentKey,
  value,
})

describe('routeBandDrop — Sets', () => {
  it('Location, same parent: reorders the folder at the slot and writes no view order', () => {
    expect(
      routeBandDrop(
        setRef('sB', null),
        { kind: 'before', beforeKey: 'sA', parentKey: null },
        scope(),
      ),
    ).toEqual({
      kind: 'fs',
      req: { op: 'reorderChildren', parentPath: 'Col', key: 'set_order', order: ['sB', 'sA'] },
    })
  })

  it('Custom, same parent: writes group_order merged over every Set, collapsed and filtered ones included', () => {
    const effect = routeBandDrop(
      setRef('sB', null),
      { kind: 'before', beforeKey: 'sA', parentKey: null },
      scope({ view: view({ group_order: ['sA2'] }) }),
    )
    expect(effect).toEqual({
      kind: 'view',
      patch: { group_order: ['sA2', 'sB', 'sA', 'sA1'] },
    })
  })

  it('Location, a between-slot under another parent: moveSet at the slot, no view order', () => {
    expect(
      routeBandDrop(
        setRef('sB', null),
        { kind: 'before', beforeKey: 'sA2', parentKey: 'sA' },
        scope(),
      ),
    ).toEqual({
      kind: 'fs',
      req: { op: 'moveSet', path: 'Col/B', newParentPath: 'Col/A', order: ['sA1', 'sB', 'sA2'] },
      after: undefined,
    })
  })

  it('into a Set lands first in the folder and, under Custom, before its first displayed child', () => {
    const effect = routeBandDrop(
      setRef('sB', null),
      { kind: 'into', parentKey: 'sA' },
      scope({ view: view({ group_order: ['sA', 'sA2', 'sA1', 'sB'] }) }),
    )
    expect(effect).toEqual({
      kind: 'fs',
      req: { op: 'moveSet', path: 'Col/B', newParentPath: 'Col/A', order: ['sB', 'sA1', 'sA2'] },
      after: { group_order: ['sA', 'sB', 'sA2', 'sA1'] },
    })
  })

  it('a de-nest whose on-screen order already reads that way writes no view order, stored or not', () => {
    expect(
      routeBandDrop(
        setRef('sA2', 'sA'),
        { kind: 'before', beforeKey: 'sB', parentKey: null },
        scope({ view: view() }),
      ),
    ).toEqual({
      kind: 'fs',
      req: { op: 'moveSet', path: 'Col/A/A2', newParentPath: 'Col', order: ['sA', 'sA2', 'sB'] },
      after: undefined,
    })
  })

  it('a nest on a view with no stored order writes none, since the folder order already shows it', () => {
    expect(
      routeBandDrop(setRef('sB', null), { kind: 'into', parentKey: 'sA' }, scope({ view: view() })),
    ).toEqual({
      kind: 'fs',
      req: { op: 'moveSet', path: 'Col/B', newParentPath: 'Col/A', order: ['sB', 'sA1', 'sA2'] },
      after: undefined,
    })
  })

  it('never writes an adopted placeholder id into group_order', () => {
    const withAdopted = set('col', 'Col', [
      set('sA', 'Col/A'),
      set('adopted-x', 'Col/X'),
      set('sB', 'Col/B'),
    ])
    expect(
      routeBandDrop(
        setRef('sB', null),
        { kind: 'before', beforeKey: 'sA', parentKey: null },
        scope({ view: view(), sets: setIndexOf(withAdopted) }),
      ),
    ).toEqual({ kind: 'view', patch: { group_order: ['sB', 'sA'] } })
  })

  it('a nest whose stored view order already reads that way writes no view order', () => {
    expect(
      routeBandDrop(
        setRef('sB', null),
        { kind: 'into', parentKey: 'sA' },
        scope({ view: view({ group_order: ['sA', 'sB', 'sA1', 'sA2'] }) }),
      ),
    ).toEqual({
      kind: 'fs',
      req: { op: 'moveSet', path: 'Col/B', newParentPath: 'Col/A', order: ['sB', 'sA1', 'sA2'] },
      after: undefined,
    })
  })

  it('into its own parent is a reorder to first', () => {
    expect(routeBandDrop(setRef('sA2', 'sA'), { kind: 'into', parentKey: 'sA' }, scope())).toEqual({
      kind: 'fs',
      req: { op: 'reorderChildren', parentPath: 'Col/A', key: 'set_order', order: ['sA2', 'sA1'] },
    })
  })

  it('a de-nest to the root end lands last at the root', () => {
    expect(
      routeBandDrop(
        setRef('sA1', 'sA'),
        { kind: 'before', beforeKey: null, parentKey: null },
        scope(),
      ),
    ).toMatchObject({ req: { op: 'moveSet', newParentPath: 'Col', order: ['sA', 'sB', 'sA1'] } })
  })
})

describe('routeBandDrop — buckets', () => {
  const grouped = (order_mode: 'configured' | 'reversed' | 'manual', order?: string[]) =>
    view({ group: { kind: 'property', property_id: 'prop_status', order_mode, order } })

  it('from Default: switches to Custom over every live option and carries the prior config', () => {
    const effect = routeBandDrop(
      bucket('closed'),
      { kind: 'before', beforeKey: 'open', parentKey: null },
      scope({ view: grouped('configured'), shown: ['active'] }),
    )
    expect(effect).toEqual({
      kind: 'view',
      patch: {
        group: {
          kind: 'property',
          property_id: 'prop_status',
          order_mode: 'manual',
          order: ['closed', 'open', 'active', 'review'],
        },
      },
      switched: {
        propertyId: 'prop_status',
        prior: {
          group: { kind: 'property', property_id: 'prop_status', order_mode: 'configured' },
        },
      },
    })
  })

  it('a sub-group bucket from Reversed writes sub_group and names its own prior', () => {
    const sub_group = { property_id: 'prop_status', order_mode: 'reversed' } as const
    const effect = routeBandDrop(
      bucket('open', 'sA'),
      { kind: 'before', beforeKey: 'sB/closed', parentKey: 'sB' },
      scope({ view: view({ sub_group }) }),
    )
    expect(effect).toMatchObject({
      patch: { sub_group: { order_mode: 'manual', order: ['open', 'closed', 'review', 'active'] } },
      switched: { propertyId: 'prop_status', prior: { sub_group } },
    })
  })

  it('already Custom: applies with no switch', () => {
    const effect = routeBandDrop(
      bucket('open'),
      { kind: 'before', beforeKey: null, parentKey: null },
      scope({ view: grouped('manual', ['open', 'active']) }),
    )
    expect(effect).toEqual({
      kind: 'view',
      patch: {
        group: {
          kind: 'property',
          property_id: 'prop_status',
          order_mode: 'manual',
          order: ['active', 'closed', 'review', 'open'],
        },
      },
      switched: undefined,
    })
  })

  it('a drop that reproduces the order writes nothing; a bucket never nests', () => {
    const s = scope({ view: grouped('configured') })
    expect(
      routeBandDrop(bucket('open'), { kind: 'before', beforeKey: 'active', parentKey: null }, s),
    ).toBeNull()
    expect(routeBandDrop(bucket('open'), { kind: 'into', parentKey: 'sA' }, s)).toBeNull()
  })
})

describe('runBandEffect', () => {
  const switched = { propertyId: 'prop_status', prior: { group: undefined } }

  it('posts the switch only after the view save resolves ok', async () => {
    const notice = vi.fn()
    const persistView = vi.fn(async () => ok({}))
    await runBandEffect(
      { kind: 'view', patch: {}, switched },
      { persistView, mutate: vi.fn(), switched: notice },
    )
    expect(notice).toHaveBeenCalledWith(switched)
    notice.mockClear()
    await runBandEffect(
      { kind: 'view', patch: {}, switched },
      { persistView: async () => fault('locked'), mutate: vi.fn(), switched: notice },
    )
    expect(notice).not.toHaveBeenCalled()
  })

  it('writes the view order only after the folder move lands', async () => {
    const persistView = vi.fn(async () => ok({}))
    const req = { op: 'reorderTop' as const, order: [] }
    await runBandEffect(
      { kind: 'fs', req, after: { group_order: ['x'] } },
      { persistView, mutate: async () => false },
    )
    expect(persistView).not.toHaveBeenCalled()
    await runBandEffect(
      { kind: 'fs', req, after: { group_order: ['x'] } },
      { persistView, mutate: async () => true },
    )
    expect(persistView).toHaveBeenCalledWith({ group_order: ['x'] })
  })
})
