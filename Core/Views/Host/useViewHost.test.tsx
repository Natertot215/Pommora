// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import type { CollectionNode, SetNode } from '@pommora/core/Nexus/tree'
import { LOCATION_SORT, type SavedView } from '@pommora/core/Views/views'
import { useSession } from '../../Session/store'
import { useViewHost, type ViewHostApi } from './useViewHost'
import { ViewHost } from './ViewHost'
import { pageValues, propsAtRoot } from '../../Testing/pageValues'
import { ID_KEY } from '@pommora/core/Nexus/identityMark'
import { stubDialer } from '../../vitest.setup'

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
  p1: { [ID_KEY]: 'p1', ...propsAtRoot({ prop_status: 'complete' }, [statusDef]) },
})

let host: HTMLDivElement
let root: Root
let saveSpy: ReturnType<typeof vi.fn>
let channels: Record<string, unknown>
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
  channels = {
    'view:loadValues': async () => ({ ok: true, value: VALUES }),
    'views:save': saveSpy,
  }
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer(channels)
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
    await mount(collection())
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
  const loadValues = (): ReturnType<typeof vi.fn> =>
    channels['view:loadValues'] as ReturnType<typeof vi.fn>
  const bump = (changes: { rel: string; pageIds: string[] }[]): void =>
    act(() => useSession.getState().bumpContainerValues(changes))

  const P2 = pageValues({
    p2: { [ID_KEY]: 'p2', ...propsAtRoot({ prop_status: 'todo' }, [statusDef]) },
  })

  beforeEach(() => {
    channels['view:loadValues'] = vi.fn(async () => ({ ok: true, value: VALUES }))
    useSession.setState({ valuesEpoch: null })
  })

  it('a container push re-reads only the named pages, merging them, and retires their overrides', async () => {
    await mount(collection())
    channels['view:loadValues'] = vi.fn(async () => ({ ok: true, value: P2 }))
    act(() =>
      api?.setValueOverride({
        p1: { fm: { id: 'p1' } as never, write: null },
        p2: { fm: { id: 'p2' } as never, write: new Promise(() => {}) },
      }),
    )
    bump([{ rel: 'Col', pageIds: ['p2'] }])
    await act(async () => {})
    expect(loadValues()).toHaveBeenCalledWith('Col', ['p2'])
    expect(api?.effectiveValues.p2).toEqual(P2.p2)
    expect(api?.effectiveValues.p1?.frontmatter).toEqual({ id: 'p1' })
    expect(api?.values.p1).toEqual(VALUES.p1)
  })

  it('a scoped read that lands after a container swap never merges into the new container', async () => {
    await mount(collection())
    let land: (v: { ok: true; value: typeof P2 }) => void = () => {}
    channels['view:loadValues'] = vi.fn((_path: string, ids?: string[]) =>
      ids
        ? new Promise((r) => {
            land = r
          })
        : Promise.resolve({ ok: true, value: {} }),
    )
    bump([{ rel: 'Col', pageIds: ['p2'] }])
    await act(async () => {})
    await mount({ ...collection(), id: 'col2', title: 'Other', path: 'Other' })
    await act(async () => {
      land({ ok: true, value: P2 })
    })
    expect(api?.values).toEqual({})
  })

  it('a scoped read that resolves no page retires no override', async () => {
    await mount(collection())
    channels['view:loadValues'] = vi.fn(async () => ({ ok: true, value: {} }))
    act(() => api?.setValueOverride({ p1: { fm: { id: 'p1' } as never, write: null } }))
    bump([{ rel: 'Col', pageIds: ['p1'] }])
    await act(async () => {})
    expect(api?.effectiveValues.p1?.frontmatter).toEqual({ id: 'p1' })
  })

  it('a failed read keeps the values already held', async () => {
    await mount(collection())
    channels['view:loadValues'] = vi.fn(async () => ({
      ok: false,
      error: { code: 'operation-failed' },
    }))
    bump([{ rel: 'Col', pageIds: ['p1'] }])
    await act(async () => {})
    expect(api?.effectiveValues.p1).toEqual(VALUES.p1)
  })

  it('a named override holds until the refetch lands, so the row never paints its fallback', async () => {
    await mount(collection())
    let land: (v: { ok: true; value: typeof P2 }) => void = () => {}
    channels['view:loadValues'] = vi.fn(
      () => new Promise<{ ok: true; value: typeof P2 }>((r) => (land = r)),
    )
    act(() => api?.setValueOverride({ p2: { fm: { id: 'p2' } as never, write: null } }))
    bump([{ rel: 'Col', pageIds: ['p2'] }])
    await act(async () => {})
    expect(api?.effectiveValues.p2?.frontmatter).toEqual({ id: 'p2' })
    await act(async () => land({ ok: true, value: P2 }))
    expect(api?.effectiveValues.p2).toEqual(P2.p2)
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
    channels['view:loadValues'] = vi.fn(async () => ({ ok: true, value: P2 }))
    act(() => api?.setValueOverride({ p2: { fm: { id: 'p2' } as never, write: null } }))
    bump([
      { rel: 'Other', pageIds: ['p9'] },
      { rel: 'Col', pageIds: ['p2'] },
    ])
    await act(async () => {})
    expect(loadValues()).toHaveBeenCalledTimes(1)
    expect(api?.effectiveValues.p2).toEqual(P2.p2)
  })

  it('a sibling container push neither refetches nor retires', async () => {
    await mount(collection())
    loadValues().mockClear()
    act(() => api?.setValueOverride({ p2: { fm: { id: 'p2' } as never, write: null } }))
    bump([{ rel: 'Other', pageIds: ['p2'] }])
    await act(async () => {})
    expect(loadValues()).not.toHaveBeenCalled()
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

const SORTED: Partial<SavedView> = {
  sort: [{ property_id: 'prop_status', direction: 'ascending' }],
}

describe('the manual order fold', () => {
  it('a reorder under a sort folds its ids into manual_order on the saved view', async () => {
    await mount(collection(SORTED))
    act(() => api?.setManualOverride(['p2', 'p1']))
    await act(async () => api?.persistView({}))
    expect(lastSavedView().manual_order).toEqual(['p2', 'p1'])
  })

  it('a structural reorder leaves the stored manual_order at its value', async () => {
    await mount(collection({ manual_order: ['p2', 'p1'] }))
    expect(api?.structuralOrder).toBe(true)
    act(() => api?.setManualOverride(['p1', 'p2']))
    await act(async () => api?.persistView({}))
    expect(lastSavedView().manual_order).toEqual(['p2', 'p1'])
  })

  it('a drag with no other live override still folds — the early-return guard', async () => {
    await mount(collection(SORTED))
    act(() => api?.setManualOverride(['p2', 'p1']))
    expect(api?.liveView.manual_order).toEqual(['p2', 'p1'])
  })

  it('the crossing: a collapse under a structural drag saves the stored order untouched', async () => {
    await mount(collection({ manual_order: ['p2', 'p1'] }))
    act(() => api?.setManualOverride(['p1', 'p2']))
    act(() => api?.toggleCollapse('g1'))
    expect(lastSavedView().collapsed_groups).toEqual(['g1'])
    expect(lastSavedView().manual_order).toEqual(['p2', 'p1'])
  })

  it('the resolver reads the view record, and the override drops once the record catches it up', async () => {
    await mount(collection({ ...SORTED, manual_order: ['p2', 'p1'] }))
    expect(api?.manualOrder).toEqual(['p2', 'p1'])
    act(() => api?.setManualOverride(['p1', 'p2']))
    expect(api?.manualOrder).toEqual(['p1', 'p2'])
    await mount(collection({ ...SORTED, manual_order: ['p1', 'p2'] }))
    expect(api?.liveView).toBe(api?.view)
  })
})

describe('settleOrders — a create composes with the live order', () => {
  const createBelowFirst = async (): Promise<void> => {
    const row = api?.rows[0]
    if (row) await act(async () => void api?.creation.createAdjacent(row, 'below'))
  }

  beforeEach(() => {
    let n = 2
    useSession.setState({
      mutate: vi.fn(async (_req: unknown, then?: (c: { id: string; path: string }) => void) => {
        n += 1
        then?.({ id: `p${n}`, path: `Col/New ${n}.md` })
        return true
      }) as never,
    })
  })

  it('two creates in a row compose into one manual_order carrying both new ids', async () => {
    await mount(collection({ ...SORTED, manual_order: ['p1', 'p2'] }))
    await createBelowFirst()
    expect(lastSavedView().manual_order).toEqual(['p1', 'p3', 'p2'])
    await createBelowFirst()
    expect(lastSavedView().manual_order).toEqual(['p1', 'p4', 'p3', 'p2'])
  })

  it("the override survives the create's own optimistic push — only a page_order-backed view resets on it", async () => {
    await mount(collection({ ...SORTED, manual_order: ['p1', 'p2'] }))
    await createBelowFirst()
    expect(api?.manualOrder).toEqual(['p1', 'p3', 'p2'])
    // The create's own mutate pushes an optimistic tree: same content, new source identity.
    await mount(collection({ ...SORTED, manual_order: ['p1', 'p2'] }))
    expect(api?.manualOrder).toEqual(['p1', 'p3', 'p2'])
  })

  it('an unsorted, ungrouped view mints no manual_order where none existed', async () => {
    await mount(collection())
    saveSpy.mockClear()
    await createBelowFirst()
    expect(saveSpy).not.toHaveBeenCalled()
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
