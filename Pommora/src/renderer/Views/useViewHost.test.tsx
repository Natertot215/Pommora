// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { PropertyDefinition } from '@shared/properties'
import type { CollectionNode, SetNode } from '@shared/types'
import { LOCATION_SORT, type SavedView } from '@shared/views'
import { useSession } from '../store'
import { useViewHost, type ViewHostApi } from './useViewHost'
import { ViewHost } from './ViewHost'
import { propsAtRoot } from '@renderer/Testing/propsAtRoot'
import { pageValues } from '@renderer/Testing/pageValues'
import { PAGE_ID_KEY } from '@shared/identity'

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

const VALUES = pageValues({
  p1: { [PAGE_ID_KEY]: 'p1', ...propsAtRoot({ prop_status: 'complete' }, [statusDef]) },
})

let host: HTMLDivElement
let root: Root
let saveSpy: ReturnType<typeof vi.fn>
let api: ViewHostApi | null = null

let upward: ViewHostApi['seam']

function Probe({ source, flatten }: { source: CollectionNode | SetNode; flatten: boolean }): null {
  api = useViewHost(source, flatten, upward)
  return null
}

const mount = async (source: CollectionNode | SetNode, flatten = false): Promise<void> => {
  await act(async () => {
    root.render(<Probe source={source} flatten={flatten} />)
  })
  await act(async () => {})
}

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  api = null
  upward = {
    foldOverrides: { current: (v) => v },
    bandBucket: { current: (key) => key },
    viewRootRef: { current: null },
    onCreated: { current: () => {} },
  }
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
    upward.foldOverrides.current = (v) => ({
      ...v,
      column_widths: { ...v.column_widths, prop_status: 120 },
    })
    await mount(collection({ column_styles: { prop_status: { look: 'compact' } } }))
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
    await mount(collection())
    upward.foldOverrides.current = (v) => ({
      ...v,
      column_widths: { ...v.column_widths, prop_status: 240 },
    })
    act(() => api?.persistView({}))
    expect(lastSavedView().column_widths?.prop_status).toBe(240)
  })
})

describe('the reset keys', () => {
  it('manualOverride drops on a source-identity echo while valueOverride survives it', async () => {
    await mount(collection())
    act(() => api?.setManualOverride(['p2', 'p1']))
    act(() => api?.setValueOverride({ p2: { fm: { id: 'p2' } as never, write: null } }))
    expect(api?.manualOrder).toEqual(['p2', 'p1'])
    await mount(collection()) // same content, new object — the watcher echo
    expect(api?.manualOrder).toBeUndefined()
    expect(api?.effectiveValues.p2?.frontmatter).toEqual({ id: 'p2' })
  })

  it('hide-then-hide: the second write still carries the first', async () => {
    await mount(collection())
    act(() => api?.hideProperty('prop_status'))
    await act(async () => api?.hideProperty('_title'))
    expect(lastSavedView().hidden_properties).toEqual(['prop_status', '_title'])
  })

  it('the order/hidden catch-up drop fires on sameIds', async () => {
    await mount(collection())
    act(() => api?.setOrderOverride(['prop_status', '_title']))
    act(() => api?.setHiddenOverride(['prop_status']))
    expect(api?.liveView.property_order).toEqual(['prop_status', '_title'])
    await mount(
      collection({ property_order: ['prop_status', '_title'], hidden_properties: ['prop_status'] }),
    )
    expect(api?.liveView.property_order).toEqual(['prop_status', '_title'])
    act(() => api?.setOrderOverride(['_title', 'prop_status']))
    expect(api?.liveView.property_order).toEqual(['_title', 'prop_status'])
  })

  it('sibling sub-Sets sharing the sentinel: navigating A → B resets every host layer, and B first-persists clean', async () => {
    const { a, b } = deepSets()
    await mount(a)
    act(() => api?.setOrderOverride(['prop_status', '_title']))
    act(() => api?.setStylePatch('prop_status', 'look', 'label'))
    act(() => api?.toggleCollapse('gA'))
    expect(api?.liveView.property_order).toEqual(['prop_status', '_title'])
    await mount(b)
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

describe('the values epoch', () => {
  const nexus = (): { loadValues: ReturnType<typeof vi.fn> } =>
    (window as unknown as { nexus: { loadValues: ReturnType<typeof vi.fn> } }).nexus
  const bump = (changes: { rel: string; pageIds: string[] }[]): void =>
    act(() => useSession.getState().bumpContainerValues(changes))

  beforeEach(() => {
    nexus().loadValues = vi.fn(async () => VALUES)
    useSession.setState({ valuesEpoch: null })
  })

  it('a container push refetches the mounted path and retires the named overrides', async () => {
    await mount(collection())
    nexus().loadValues.mockClear()
    act(() =>
      api?.setValueOverride({
        p1: { fm: { id: 'p1' } as never, write: new Promise(() => {}) },
        p2: { fm: { id: 'p2' } as never, write: null },
      }),
    )
    bump([{ rel: 'Col', pageIds: ['p1'] }])
    await act(async () => {})
    expect(nexus().loadValues).toHaveBeenCalledWith('Col')
    expect(api?.effectiveValues.p1).toEqual(VALUES.p1)
    expect(api?.effectiveValues.p2?.frontmatter).toEqual({ id: 'p2' })
  })

  it('a named override holds until the refetch lands, so the row never paints its fallback', async () => {
    await mount(collection())
    let land: (v: typeof VALUES) => void = () => {}
    nexus().loadValues = vi.fn(() => new Promise<typeof VALUES>((r) => (land = r)))
    act(() => api?.setValueOverride({ p2: { fm: { id: 'p2' } as never, write: null } }))
    bump([{ rel: 'Col', pageIds: ['p2'] }])
    await act(async () => {})
    expect(api?.effectiveValues.p2?.frontmatter).toEqual({ id: 'p2' })
    await act(async () => land(VALUES))
    expect(api?.effectiveValues.p2).toEqual(VALUES.p2)
  })

  it('a push naming no ids retires the settled override and keeps the pending one', async () => {
    await mount(collection())
    act(() =>
      api?.setValueOverride({
        p1: { fm: { id: 'p1' } as never, write: new Promise(() => {}) },
        p2: { fm: { id: 'p2' } as never, write: null },
      }),
    )
    bump([{ rel: 'Col', pageIds: [] }])
    await act(async () => {})
    expect(api?.effectiveValues.p1?.frontmatter).toEqual({ id: 'p1' })
    expect(api?.effectiveValues.p2).toBeUndefined()
  })

  it('one push over several containers reaches the mounted one', async () => {
    await mount(collection())
    nexus().loadValues.mockClear()
    act(() => api?.setValueOverride({ p2: { fm: { id: 'p2' } as never, write: null } }))
    bump([
      { rel: 'Other', pageIds: ['p9'] },
      { rel: 'Col', pageIds: ['p2'] },
    ])
    await act(async () => {})
    expect(nexus().loadValues).toHaveBeenCalledTimes(1)
    expect(api?.effectiveValues.p2).toBeUndefined()
  })

  it('a sibling container push neither refetches nor retires', async () => {
    await mount(collection())
    nexus().loadValues.mockClear()
    act(() => api?.setValueOverride({ p2: { fm: { id: 'p2' } as never, write: null } }))
    bump([{ rel: 'Other', pageIds: ['p2'] }])
    await act(async () => {})
    expect(nexus().loadValues).not.toHaveBeenCalled()
    expect(api?.effectiveValues.p2?.frontmatter).toEqual({ id: 'p2' })
  })

  it('a rename re-keys the override instead of clearing it', async () => {
    await mount(collection())
    act(() =>
      api?.setValueOverride({
        p2: { fm: { id: 'p2', Status: ['Done'] } as never, write: null },
      }),
    )
    act(() => useSession.getState().bumpValuesEpoch('Status', 'State'))
    await act(async () => {})
    expect(api?.effectiveValues.p2?.frontmatter).toEqual({ id: 'p2', State: ['Done'] })
  })
})

/** A[pA] — one Set so structural grouping has a band to relocate into. */
const setCollection = (view?: Partial<SavedView>): CollectionNode =>
  ({
    kind: 'collection',
    id: 'col1',
    title: 'Col',
    path: 'Col',
    sets: [
      {
        kind: 'set',
        id: 'sA',
        title: 'A',
        path: 'Col/A',
        pages: [page('pA', 'In A', 'Col/A/In A.md')],
        sets: [],
      },
    ],
    pages: [page('pLoose', 'Loose', 'Col/Loose.md')],
    properties: [statusDef],
    views: [
      {
        id: 'view_1',
        name: 'Cards',
        type: 'cards',
        property_order: ['_title', 'prop_status'],
        hidden_properties: [],
        group: { kind: 'structural' },
        ...view,
      },
    ],
  }) as unknown as CollectionNode

describe('the cards seam (flattenStructural)', () => {
  it('a type-switched view still carrying sub_group never arms reassign — relocation stays the only cross-band write', async () => {
    const carried = setCollection({
      sub_group: { property_id: 'prop_status', order_mode: 'manual' },
    })
    await mount(carried, true)
    expect(api?.subGrouped).toBe(false)
    expect(api?.groupPropId).toBeUndefined()
    expect(api?.canReassign).toBe(false)
    expect(api?.canRelocate).toBe(true)
    await mount(carried, false)
    expect(api?.subGrouped).toBe(true)
    expect(api?.groupPropId).toBe('prop_status')
  })

  it('location fs order retires reorder only under the flattened seam', async () => {
    const located = setCollection({
      group: { kind: 'flat' },
      sort: [{ property_id: LOCATION_SORT, direction: 'asc' }],
    } as unknown as Partial<SavedView>)
    await mount(located, true)
    expect(api?.canReorderWithin).toBe(false)
    expect(api?.manualOrder).toBeUndefined()
    await mount(located, false)
    expect(api?.canReorderWithin).toBe(true)
  })

  it('a cards persist mid-collapse keeps the collapse, and a caught-up style patch dies', async () => {
    await mount(setCollection(), true)
    act(() => api?.toggleCollapse('sA'))
    await act(async () => api?.persistView({}))
    expect(lastSavedView().collapsed_groups).toEqual(['sA'])
    act(() => api?.setStylePatch('prop_status', 'look', 'compact'))
    expect(api?.liveView).not.toBe(api?.view)
    await mount(setCollection({ column_styles: { prop_status: { look: 'compact' } } }), true)
    expect(api?.liveView).toBe(api?.view)
  })
})

describe('the root seat', () => {
  const mountSeat = async (source: CollectionNode): Promise<void> => {
    await act(async () => {
      root.render(<ViewHost source={source} />)
    })
    await act(async () => {})
  }

  it('paints Loading… while the host is null', async () => {
    useSession.setState({ tree: null as never })
    await mountSeat(collection())
    expect(host.textContent).toContain('Loading…')
  })

  it('paints No pages here when the pipeline yields no groups', async () => {
    const empty = collection()
    ;(empty as unknown as { pages: unknown[] }).pages = []
    await mountSeat(empty)
    expect(host.textContent).toContain('No pages here')
  })

  it('a cards view with Sets present mounts the renderer instead — the Set Cards toggle is irrelevant', async () => {
    const source = setCollection({
      hide_empty_groups: true,
      set_cards: false,
    } as unknown as Partial<SavedView>)
    ;(source as unknown as { pages: unknown[] }).pages = []
    ;(source.sets?.[0] as unknown as { pages: unknown[] }).pages = []
    useSession.setState({
      tree: { collections: [], contexts: [], personalization: {}, nexus: { id: 'nx' } } as never,
    })
    await mountSeat(source)
    expect(host.textContent).not.toContain('No pages here')
    expect(host.querySelector('.cards-view')).toBeTruthy()
  })
})
