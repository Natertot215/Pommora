// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { ReactNode } from 'react'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import type { ColumnStyle } from '@pommora/core/Properties/columnStyles'
import type { CollectionNode, SetNode } from '@pommora/core/Nexus/tree'
import type { ResolvedGroup } from '@pommora/core/Views/viewRow'
import type { SavedView, SubGroupConfig } from '@pommora/core/Views/views'
import { carries, type Family, type LineSpec } from '@pommora/uix/Interactions/drag'
import { type Geometry, laneSlot, type Row } from '@pommora/uix/Interactions/reorderModel'
import { ROW_END, rowLine, rowSnap } from '../Table/rowInsertion'
import { mountEachTest } from '../../Testing/viewHarness'
import { BandGlyph, bandSpec, GroupBand, bandedSpec } from './GroupBand'
import { bandModelOf, bandNodeOf, headContextOf } from './bandModel'
import { setIndexOf } from './setIndex'

const schema: PropertyDefinition[] = [
  {
    id: 'prop_status',
    name: 'Status',
    type: 'status',
    status_groups: [
      {
        id: 'g',
        label: 'G',
        color: 'blue',
        options: [{ value: 'active', color: 'blue', group_id: 'g' }],
      },
    ],
  },
  {
    id: 'prop_select',
    name: 'Sel',
    type: 'select',
    select_options: [{ value: 'red', color: 'red' }],
  },
  { id: 'prop_date', name: 'When', type: 'dateTime' },
] as PropertyDefinition[]

const setA = { kind: 'set', id: 'sA', title: 'Alpha', path: 'Inbox/Alpha', sets: [], pages: [] }
const source = {
  kind: 'collection',
  id: 'c',
  title: 'Inbox',
  path: 'Inbox',
  sets: [setA as unknown as SetNode],
  pages: [],
  properties: [],
  views: [],
} as unknown as CollectionNode

const view = {
  id: 'v',
  name: 'V',
  type: 'table',
  property_order: [],
  hidden_properties: [],
} as unknown as SavedView
const grouping = (property_id: string, extra: Partial<SubGroupConfig> = {}): SubGroupConfig => ({
  property_id,
  order_mode: 'configured',
  ...extra,
})
const styleOf =
  (date_format: ColumnStyle['date_format'] = 'full') =>
  (): ColumnStyle =>
    ({ date_format }) as ColumnStyle
const heads = (sub?: SubGroupConfig, format: ColumnStyle['date_format'] = 'full') =>
  headContextOf(source, setIndexOf(source), sub, schema, view, styleOf(format))
const group = (kind: 'set' | 'tail' | 'bucket', key: string, value = key): ResolvedGroup =>
  kind === 'bucket' ? { key, kind, value, items: [] } : { key, kind, items: [] }
const nodeOf = (g: ResolvedGroup, h: ReturnType<typeof heads>) => {
  const node = bandNodeOf(g, 0, null, h)
  if (!node || node.kind === 'tail') throw new Error('expected a headed band')
  return node
}

let host: HTMLDivElement
let root: Root
mountEachTest((h, r) => {
  host = h
  root = r
})
const textOf = (glyph: ReactNode): string => {
  host = document.createElement('div')
  root = createRoot(host)
  act(() => root.render(glyph))
  return host.textContent ?? ''
}

describe('BandGlyph', () => {
  it('a Set → the Set icon + name', () => {
    const node = nodeOf(group('set', 'sA'), heads())
    expect(node.kind === 'set' && node.set.title).toBe('Alpha')
    expect(textOf(<BandGlyph node={node} />)).toContain('Alpha')
  })

  it('status → the option value (a Chip)', () => {
    const node = nodeOf(group('bucket', 'active'), heads(grouping('prop_status')))
    expect(textOf(<BandGlyph node={node} />)).toContain('active')
  })

  it('select → the option value (a Chip)', () => {
    const node = nodeOf(group('bucket', 'red'), heads(grouping('prop_select')))
    expect(textOf(<BandGlyph node={node} />)).toContain('red')
  })

  it('a sub-band inside a Set band → its bucket value, not its composite key', () => {
    const node = nodeOf(group('bucket', 'sA/red', 'red'), heads(grouping('prop_select')))
    expect(textOf(<BandGlyph node={node} />)).toContain('red')
    expect(textOf(<BandGlyph node={node} />)).not.toContain('sA')
  })

  it('dateTime → the formatted bucket label', () => {
    const node = nodeOf(
      group('bucket', '2026-07'),
      heads(grouping('prop_date', { date_granularity: 'month' })),
    )
    expect(node.kind === 'bucket' && node.label).toBe('July 2026')
    expect(textOf(<BandGlyph node={node} />)).toContain('July 2026')
  })

  it("a date band with no form of its own takes the Nexus's", () => {
    const node = nodeOf(
      group('bucket', '2026-07'),
      heads(grouping('prop_date', { date_granularity: 'month' }), 'monthDayYear'),
    )
    expect(textOf(<BandGlyph node={node} />)).toContain('07-2026')
  })
})

describe('GroupBand', () => {
  const bandView = {
    collapsed: new Set<string>(),
    toggle: vi.fn(),
    add: vi.fn(),
    open: vi.fn(),
    springs: () => false,
  }

  it('a tail renders its rows with no head', () => {
    const tail = bandNodeOf(group('tail', 'tail'), 0, null, heads())
    act(() =>
      root.render(
        <GroupBand node={tail ?? undefined} bands={bandView}>
          <p>rows</p>
        </GroupBand>,
      ),
    )
    expect(host.textContent).toBe('rows')
    expect(host.querySelector('.group-band-head')).toBeNull()
  })

  it("a Date band's head carries no drag handle", () => {
    const h = heads(grouping('prop_date', { date_granularity: 'month' }))
    const bands = bandModelOf([group('bucket', '2026-07')], h)
    const spec = bandSpec({
      bands,
      collapsed: new Set(),
      nests: false,
      drop: vi.fn(),
    })
    const geometry: Geometry = { rows: [], groups: new Map(), bottom: 0 }
    expect(spec.snap('2026-07', geometry)).toBeNull()
  })
})

describe('bandedSpec', () => {
  const geometry: Geometry = { rows: [], groups: new Map(), bottom: 0 }
  const rowsSpec = (over: Partial<LineSpec<string, string>> = {}): LineSpec<string, string> => ({
    snap: () => 'row-snap',
    resolve: () => 'row-slot',
    commit: vi.fn(),
    label: () => 'row',
    watch: [],
    ...over,
  })
  const bandsSpec = (over: Partial<LineSpec<string, string>> = {}): LineSpec<string, string> => ({
    snap: () => 'band-snap',
    resolve: () => 'band-slot',
    commit: vi.fn(),
    label: () => 'band',
    watch: [],
    ...over,
  })
  const isRow = (id: string): boolean => id.startsWith('r')

  it('a band key dispatches to the band spec', () => {
    const bands = bandsSpec()
    const spec = bandedSpec(isRow, rowsSpec(), bands)
    const snap = spec.snap('sA', geometry)
    expect(snap).toEqual({ band: 'band-snap' })
    expect(spec.resolve('sA', { x: 0, y: 0 }, snap as never)).toBe('band-slot')
    spec.commit('sA', 'band-slot' as never, snap as never)
    expect(bands.commit).toHaveBeenCalledWith('sA', 'band-slot', 'band-snap')
    expect(spec.label('sA')).toBe('band')
  })

  it('a row key dispatches to the row spec', () => {
    const rows = rowsSpec()
    const spec = bandedSpec(isRow, rows, bandsSpec())
    const snap = spec.snap('r1', geometry)
    expect(snap).toEqual({ row: 'row-snap' })
    spec.commit('r1', 'row-slot' as never, snap as never)
    expect(rows.commit).toHaveBeenCalledWith('r1', 'row-slot', 'row-snap')
    expect(spec.label('r1')).toBe('row')
  })

  it('a row whose spec is locked resolves null while its carry still yields the page', () => {
    const family: Family<string> = {
      id: 'tabs',
      to: () => true,
    } as unknown as Family<string>
    const carry = [carries(family, vi.fn())]
    const rows = rowsSpec({ snap: () => null, carry })
    const spec = bandedSpec(isRow, rows, bandsSpec())
    expect(spec.snap('r1', geometry)).toBeNull()
    expect(spec.carry).toBe(carry)
  })

  it('a disabled band spec snaps nothing', () => {
    const spec = bandedSpec(isRow, rowsSpec(), bandsSpec({ disabled: true }))
    expect(spec.snap('sA', geometry)).toBeNull()
  })

  it('disclose answers per dragged kind', () => {
    const disclose = vi.fn(() => true)
    const spec = bandedSpec(isRow, rowsSpec({ disclose: false }), bandsSpec({ disclose }))
    const answer = spec.disclose as (id: string) => boolean
    expect(answer('r1')).toBe(false)
    expect(answer('sA')).toBe(true)
    expect(disclose).toHaveBeenCalledWith('sA')
    const across = bandedSpec(isRow, rowsSpec({ disclose: (id) => id === 'r1' }), bandsSpec())
    expect((across.disclose as (id: string) => boolean)('r1')).toBe(true)
  })

  it("a band head's lower half targets the start of the band below", () => {
    const row = (id: string, top: number): Row => ({
      id,
      top,
      bottom: top + 20,
      mid: top + 10,
      left: 0,
      right: 200,
    })
    const g: Geometry = {
      rows: [row('r1', 0), row('headB', 30), row('r2', 60), row('r3', 80)],
      groups: new Map([[ROW_END, row(ROW_END, 0)]]),
      bottom: 200,
    }
    const bandOf = new Map([
      ['r1', 'a'],
      ['r2', 'b'],
      ['r3', 'b'],
    ])
    const rows: LineSpec<ReturnType<typeof laneSlot>, ReturnType<typeof rowSnap>> = {
      snap: (id, geo) => rowSnap(geo, id, bandOf),
      resolve: (_id, p, s) => laneSlot(s!, p.y, true),
      commit: vi.fn(),
      line: (slot, s) => rowLine(slot!, s!),
      label: () => 'row',
      watch: [bandOf],
    }
    const spec = bandedSpec(isRow, rows, bandsSpec())
    const snap = spec.snap('r3', g)!
    expect(spec.resolve('r3', { x: 0, y: 36 }, snap)).toMatchObject({ lane: 'a', before: null })
    expect(spec.resolve('r3', { x: 0, y: 44 }, snap)).toMatchObject({
      lane: 'b',
      index: 0,
      before: 'r2',
    })
  })
})
