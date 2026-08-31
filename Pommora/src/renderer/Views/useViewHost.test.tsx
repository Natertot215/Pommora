// @vitest-environment jsdom
// The host's own laws, pinned at the hook: the persist fold (collapse + live style patch + the
// renderer's fold ref, explicit patch last) · the reset keys ([source.id, view.id] for host layers —
// sibling sub-Sets share the DEFAULT_VIEW_ID sentinel — [source] identity for the manual-order drop,
// [source.path] for values) · the sameIds catch-up drop · the fire-time fold read.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { PropertyDefinition } from '@shared/properties'
import type { CollectionNode, SetNode } from '@shared/types'
import type { SavedView } from '@shared/views'
import { useSession } from '../store'
import { useViewHost, type ViewHostApi, type ViewHostSeam } from './useViewHost'
import { propsAtRoot } from '@renderer/Testing/propsAtRoot'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const statusDef: PropertyDefinition = {
  id: 'prop_status',
  name: 'Status',
  type: 'status',
  status_groups: [
    {
      id: 'done',
      label: 'Done',
      color: 'green',
      options: [{ value: 'complete', label: 'Complete', color: 'green', group_id: 'done' }],
    },
  ],
}

const page = (id: string, title: string, path: string): Record<string, unknown> => ({
  kind: 'page',
  id,
  title,
  path,
})

const collection = (view?: Partial<SavedView>): CollectionNode =>
  ({
    kind: 'collection',
    id: 'col1',
    title: 'Col',
    path: 'Col',
    sets: [],
    pages: [page('p1', 'One', 'Col/One.md'), page('p2', 'Two', 'Col/Two.md')],
    properties: [statusDef],
    views: [
      {
        id: 'view_1',
        name: 'Table',
        type: 'table',
        property_order: ['_title', 'prop_status'],
        hidden_properties: [],
        ...view,
      },
    ],
  }) as unknown as CollectionNode

/** Col/Parent/A + Col/Parent/B — depth-2 siblings, so pickView hands BOTH the sentinel view id. */
const deepSets = (): { a: SetNode; b: SetNode } => {
  const sub = (id: string, title: string): Record<string, unknown> => ({
    kind: 'set',
    id,
    title,
    path: `Col/Parent/${title}`,
    pages: [page(`p${id}`, `In ${title}`, `Col/Parent/${title}/In ${title}.md`)],
    sets: [],
  })
  const a = sub('sA', 'A')
  const b = sub('sB', 'B')
  const root = {
    kind: 'collection',
    id: 'col1',
    title: 'Col',
    path: 'Col',
    sets: [{ kind: 'set', id: 'sP', title: 'Parent', path: 'Col/Parent', pages: [], sets: [a, b] }],
    pages: [],
    properties: [statusDef],
    views: [],
  }
  useSession.setState({ tree: { collections: [root], contexts: [], personalization: {} } as never })
  return { a: a as unknown as SetNode, b: b as unknown as SetNode }
}

const VALUES = {
  p1: { id: 'p1', ...propsAtRoot({ prop_status: 'complete' }, [statusDef]) },
}

let host: HTMLDivElement
let root: Root
let saveSpy: ReturnType<typeof vi.fn>
let api: ViewHostApi | null = null

const seamWith = (over?: Partial<ViewHostSeam>): ViewHostSeam => ({
  flattenStructural: false,
  bandBucket: (key) => key,
  viewRootRef: { current: null },
  onCreated: () => {},
  ...over,
})

const upward: ViewHostApi['seam'] = {
  foldOverrides: { current: (v) => v },
  bandBucket: { current: (key) => key },
  viewRootRef: { current: null },
  onCreated: { current: () => {} },
}

function Probe({ source, seam }: { source: CollectionNode | SetNode; seam: ViewHostSeam }): null {
  api = useViewHost(source, seam, upward)
  return null
}

const mount = async (source: CollectionNode | SetNode, seam: ViewHostSeam): Promise<void> => {
  await act(async () => {
    root.render(<Probe source={source} seam={seam} />)
  })
  await act(async () => {})
}

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  api = null
  saveSpy = vi.fn(async () => ({ ok: true, value: { id: 'v1' } }))
  ;(window as unknown as { nexus: unknown }).nexus = {
    loadValues: async () => VALUES,
    activeViews: { get: async () => ({}), set: async () => undefined },
    viewOrders: { get: async () => ({}) },
    views: { save: saveSpy },
  }
  useSession.setState({
    tree: { collections: [], contexts: [], personalization: {} } as never,
    mutate: vi.fn(async () => true) as never,
  })
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const lastSavedView = (): SavedView => saveSpy.mock.calls.at(-1)?.[2] as SavedView

describe('the persist fold', () => {
  it('one save carries collapse + a live style patch + the fold ref, the explicit patch winning', async () => {
    const foldOverrides = {
      current: (v: SavedView): SavedView => ({
        ...v,
        column_widths: { ...v.column_widths, prop_status: 120 },
      }),
    }
    await mount(
      collection({ column_styles: { prop_status: { look: 'compact' } } }),
      seamWith({ foldOverrides }),
    )
    act(() => api?.toggleCollapse('g1'))
    act(() => api?.setStylePatch('prop_status', 'date_format', 'relative'))
    act(() => api?.persistView({ hide_borders: true, column_widths: { prop_status: 90 } }))
    const saved = lastSavedView()
    expect(saved.collapsed_groups).toEqual(['g1'])
    expect(saved.column_styles?.prop_status).toEqual({ look: 'compact', date_format: 'relative' })
    expect(saved.hide_borders).toBe(true)
    expect(saved.column_widths?.prop_status).toBe(90)
  })

  it('a persist fired after a round-trip reads the fire-time fold, not the mount closure', async () => {
    const foldOverrides = { current: (v: SavedView): SavedView => v }
    await mount(collection(), seamWith({ foldOverrides }))
    foldOverrides.current = (v) => ({
      ...v,
      column_widths: { ...v.column_widths, prop_status: 240 },
    })
    act(() => api?.persistView({}))
    expect(lastSavedView().column_widths?.prop_status).toBe(240)
  })
})

describe('the reset keys', () => {
  it('manualOverride drops on a source-identity echo while valueOverride survives it', async () => {
    const seam = seamWith()
    await mount(collection(), seam)
    act(() => api?.setManualOverride(['p2', 'p1']))
    act(() => api?.setValueOverride({ p2: { id: 'p2' } as never }))
    expect(api?.manualOrder).toEqual(['p2', 'p1'])
    await mount(collection(), seam) // same content, new object — the watcher echo
    expect(api?.manualOrder).toBeUndefined()
    expect(api?.effectiveValues.p2).toEqual({ id: 'p2' })
  })

  it('the order/hidden catch-up drop fires on sameIds', async () => {
    const seam = seamWith()
    await mount(collection(), seam)
    act(() => api?.setOrderOverride(['prop_status', '_title']))
    act(() => api?.setHiddenOverride(['prop_status']))
    expect(api?.liveView.property_order).toEqual(['prop_status', '_title'])
    await mount(
      collection({ property_order: ['prop_status', '_title'], hidden_properties: ['prop_status'] }),
      seam,
    )
    expect(api?.liveView.property_order).toEqual(['prop_status', '_title'])
    act(() => api?.setOrderOverride(['_title', 'prop_status']))
    expect(api?.liveView.property_order).toEqual(['_title', 'prop_status'])
  })

  it('sibling sub-Sets sharing the sentinel: navigating A → B resets every host layer, and B first-persists clean', async () => {
    const { a, b } = deepSets()
    const seam = seamWith()
    await mount(a, seam)
    act(() => api?.setOrderOverride(['prop_status', '_title']))
    act(() => api?.setStylePatch('prop_status', 'look', 'label'))
    act(() => api?.toggleCollapse('gA'))
    expect(api?.liveView.property_order).toEqual(['prop_status', '_title'])
    await mount(b, seam)
    expect(api?.liveView.property_order).not.toEqual(['prop_status', '_title'])
    expect(api?.collapsed.size).toBe(0)
    saveSpy.mockClear()
    await act(async () => api?.persistView({}))
    const saved = lastSavedView()
    expect(saved.property_order).not.toEqual(['prop_status', '_title'])
    expect(saved.collapsed_groups).toEqual([])
    expect(saved.column_styles?.prop_status).toBeUndefined()
  })
})
