// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { ReactNode } from 'react'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import { EMPTY_ASSET_MAP, type CollectionNode } from '@pommora/core/Nexus/tree'
import type { ResolvedGroup } from '@pommora/core/Views/viewRow'
import type { GroupConfig, SavedView } from '@pommora/core/Views/views'
import type { ValueContext } from '../../Properties/valueContext'
import { resolveBandHead } from './GroupBand'
import { mountEachTest } from '../../Testing/viewHarness'

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
        options: [{ value: 'active', label: 'Active', color: 'blue', group_id: 'g' }],
      },
    ],
  },
  {
    id: 'prop_select',
    name: 'Sel',
    type: 'select',
    select_options: [{ value: 'red', label: 'Red', color: 'red' }],
  },
  { id: 'prop_date', name: 'When', type: 'dateTime' },
] as PropertyDefinition[]

const ctx: ValueContext = {
  schema,
  contextsById: new Map(),
  contexts: new Map(),
  assets: EMPTY_ASSET_MAP,
}
const source = {
  kind: 'collection',
  id: 'c',
  title: 'Inbox',
  path: 'Inbox',
  sets: [],
  pages: [],
  properties: [],
  views: [],
} as unknown as CollectionNode
const setNames = new Map([['sA', 'Alpha']])
const setIcons = new Map<string, string | undefined>([['sA', undefined]])

const view = (group?: GroupConfig): SavedView =>
  ({
    id: 'v',
    name: 'V',
    type: 'table',
    property_order: [],
    hidden_properties: [],
    ...(group ? { group } : {}),
  }) as SavedView
const propGroup = (property_id: string, extra: Partial<GroupConfig> = {}): GroupConfig =>
  ({
    kind: 'property',
    property_id,
    order_mode: 'configured',
    ...extra,
  }) as GroupConfig
const group = (kind: ResolvedGroup['kind'], key: string): ResolvedGroup => ({
  key,
  kind,
  items: [],
})

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

const NEXUS = { dateFormat: 'full', clock: 'twelveHour' } as const

describe('resolveBandHead', () => {
  it('structural-set → the Set icon + name', () => {
    const head = resolveBandHead(
      group('structural-set', 'sA'),
      view(),
      ctx,
      NEXUS,
      setNames,
      setIcons,
      source,
    )
    expect(head.label).toBe('Alpha')
    expect(textOf(head.glyph)).toContain('Alpha')
  })

  it('status → the option label (a Chip)', () => {
    const head = resolveBandHead(
      group('property', 'active'),
      view(propGroup('prop_status')),
      ctx,
      NEXUS,
      setNames,
      setIcons,
      source,
    )
    expect(head.label).toBe('Active')
    expect(textOf(head.glyph)).toContain('Active')
  })

  it('select → the option label (a Chip)', () => {
    const head = resolveBandHead(
      group('property', 'red'),
      view(propGroup('prop_select')),
      ctx,
      NEXUS,
      setNames,
      setIcons,
      source,
    )
    expect(head.label).toBe('Red')
    expect(textOf(head.glyph)).toContain('Red')
  })

  it('dateTime → the bucket label (formatted), the raw key as text label', () => {
    const head = resolveBandHead(
      group('property', '2026-07'),
      view(propGroup('prop_date', { date_granularity: 'month' })),
      ctx,
      NEXUS,
      setNames,
      setIcons,
      source,
    )
    expect(textOf(head.glyph)).toContain('July 2026')
  })

  it("a date band with no form of its own takes the Nexus's", () => {
    const head = resolveBandHead(
      group('property', '2026-07'),
      view(propGroup('prop_date', { date_granularity: 'month' })),
      ctx,
      { ...NEXUS, dateFormat: 'monthDayYear' },
      setNames,
      setIcons,
      source,
    )
    expect(textOf(head.glyph)).toContain('07-2026')
  })

  it('ungrouped → the container heading', () => {
    const head = resolveBandHead(
      group('ungrouped', '_ungrouped'),
      view(),
      ctx,
      NEXUS,
      setNames,
      setIcons,
      source,
    )
    expect(head.label).toBe('Inbox')
    expect(textOf(head.glyph)).toContain('Inbox')
  })
})
