// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { ReactNode } from 'react'
import type { PropertyDefinition } from '@shared/properties'
import { EMPTY_ASSET_MAP, type CollectionNode, type ResolvedGroup } from '@shared/types'
import type { GroupConfig, SavedView } from '@shared/views'
import type { ResolveContext } from './Table/resolveContext'
import { resolveBandHead } from './GroupBand'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

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
  { id: 'prop_check', name: 'Done', type: 'checkbox' },
  { id: 'prop_date', name: 'When', type: 'datetime' },
] as PropertyDefinition[]

const ctx: ResolveContext = {
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
    empty_placement: 'bottom',
    hide_empty_groups: false,
    ...extra,
  }) as GroupConfig
const group = (kind: ResolvedGroup['kind'], key: string, bucket?: string): ResolvedGroup => ({
  key,
  kind,
  items: [],
  isCollapsed: false,
  ...(bucket !== undefined ? { bucket } : {}),
})

let host: HTMLDivElement
let root: Root
const textOf = (glyph: ReactNode): string => {
  host = document.createElement('div')
  root = createRoot(host)
  act(() => root.render(glyph))
  return host.textContent ?? ''
}
afterEach(() => {
  act(() => root.unmount())
})

describe('resolveBandHead', () => {
  it('structural-set → the Set icon + name', () => {
    const head = resolveBandHead(
      group('structural-set', 'sA'),
      view(),
      ctx,
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
      setNames,
      setIcons,
      source,
    )
    expect(head.label).toBe('Red')
    expect(textOf(head.glyph)).toContain('Red')
  })

  it('checkbox → the box glyph + On/Off', () => {
    const on = resolveBandHead(
      group('property', 'true'),
      view(propGroup('prop_check')),
      ctx,
      setNames,
      setIcons,
      source,
    )
    expect(textOf(on.glyph)).toContain('On')
    const off = resolveBandHead(
      group('property', 'false'),
      view(propGroup('prop_check')),
      ctx,
      setNames,
      setIcons,
      source,
    )
    expect(textOf(off.glyph)).toContain('Off')
  })

  it('datetime → the bucket label (formatted), the raw key as text label', () => {
    const head = resolveBandHead(
      group('property', '2026-07'),
      view(propGroup('prop_date', { date_granularity: 'month' })),
      ctx,
      setNames,
      setIcons,
      source,
    )
    expect(textOf(head.glyph)).toContain('July 2026')
  })

  it('ungrouped → the container heading', () => {
    const head = resolveBandHead(
      group('ungrouped', '_ungrouped'),
      view(),
      ctx,
      setNames,
      setIcons,
      source,
    )
    expect(head.label).toBe('Inbox')
    expect(textOf(head.glyph)).toContain('Inbox')
  })
})

describe('resolveBandHead — Context grouping', () => {
  const ctxWithSpace: ResolveContext = {
    ...ctx,
    contextsById: new Map([
      ['sp1', { title: 'Pommora', icon: 'rocket', color: 'mint', contextId: 'ctx_projects' }],
    ]),
    contexts: new Map([['ctx_projects', { title: 'Projects', icon: 'folder' }]]),
  }

  it('names the Space rather than showing its id', () => {
    const head = resolveBandHead(
      group('property', 'sp1'),
      view(propGroup('ctx_projects')),
      ctxWithSpace,
      setNames,
      setIcons,
      source,
    )
    expect(head.label).toBe('Pommora')
    expect(textOf(head.glyph)).toContain('Pommora')
  })

  it('falls back to the raw id when the Space is gone', () => {
    const head = resolveBandHead(
      group('property', 'ghost'),
      view(propGroup('ctx_projects')),
      ctxWithSpace,
      setNames,
      setIcons,
      source,
    )
    expect(head.label).toBe('ghost')
  })
})
