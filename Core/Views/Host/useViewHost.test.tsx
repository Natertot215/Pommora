// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { Root } from 'react-dom/client'
import type { PropertyDefinition } from '../../Properties/properties'
import type { CollectionNode, SetNode } from '../../Nexus/tree'
import { LOCATION_SORT, type SavedView } from '../views'
import { ContentHostContext } from '../../Interface/contentHost'
import { useSession } from '../../Session/store'
import { useViewHost, type ViewHostApi } from './useViewHost'
import { mutateAhead } from './pendingView'
import type { OrderRequest } from './pendingView'
import { useContainerValues, useValuesEpoch } from './useContainerValues'
import { useViewCreation } from './useViewCreation'
import { patchOverride } from '../../Properties/valueOverride'
import { propsAtRoot, pageValues } from '../../Testing/pageValues'
import { ID_KEY } from '../../Nexus/identityMark'
import { stubDialer } from '../../vitest.setup'
import { mountEachTest, renderView } from '../../Testing/viewHarness'
import { ViewTileScopeProvider } from '../ViewTileScope'
import { makeTree } from '../../Testing/testTree'

const statusDef: PropertyDefinition = {
  id: 'prop_status',
  name: 'Status',
  type: 'status',
  status_groups: [
    {
      id: 'done',
      label: 'Done',
      color: 'green',
      options: [{ value: 'complete', color: 'green', group_id: 'done' }],
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
  useSession.setState({
    tree: { collections: [root], contexts: [], config: { personalization: {} } } as never,
  })
  return { a: a as unknown as SetNode, b: b as unknown as SetNode }
}

const VALUES = pageValues({
  p1: { [ID_KEY]: 'p1', ...propsAtRoot({ prop_status: 'complete' }, [statusDef]) },
})

let host: HTMLDivElement
let root: Root
mountEachTest((h, r) => {
  host = h
  root = r
})
let saveSpy: ReturnType<typeof vi.fn>
let channels: Record<string, unknown>
let api: ViewHostApi | null = null

let creation: ReturnType<typeof useViewCreation>

function Probe({ source, nests }: { source: CollectionNode | SetNode; nests: boolean }): null {
  const host = useViewHost(source, nests)
  api = host
  creation = useViewCreation(() => ({ ...host!, bandBucket: (key) => key, onCreated: () => {} }))
  return null
}

const mount = async (source: CollectionNode | SetNode, nests = true): Promise<void> => {
  await act(async () => {
    root.render(
      <ContentHostContext.Provider value={{ tabId: 't1', key: 'collection:col1', parked: false }}>
        <Probe source={source} nests={nests} />
      </ContentHostContext.Provider>,
    )
  })
  await act(async () => {})
}

beforeEach(() => {
  api = null
  saveSpy = vi.fn(async () => ({ ok: true, value: { id: 'v1' } }))
  channels = {
    'view:loadValues': async () => ({ ok: true, value: VALUES }),
    'views:save': saveSpy,
  }
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer(channels)
  useSession.setState({
    tree: { collections: [], contexts: [], config: { personalization: {} } } as never,
    mutate: vi.fn(async () => ({})) as never,
    activeTabId: 't1',
    viewSearch: {},
  })
})

const moveP2First: OrderRequest = {
  op: 'movePage',
  path: 'Col/Two.md',
  newParentPath: 'Col',
  order: ['p2', 'p1'],
}
const lastSavedView = (): SavedView => saveSpy.mock.calls.at(-1)?.[2] as SavedView
const paintOrder = (): string[] | undefined =>
  api?.groups.flatMap((g) =>
    [...g.items, ...(g.children ?? []).flatMap((c) => c.items)].map((r) => r.id),
  )

const threeStatus: PropertyDefinition = {
  ...statusDef,
  status_groups: [
    {
      id: 'done',
      label: 'Done',
      color: 'green',
      options: [
        { value: 'complete', color: 'green', group_id: 'done' },
        { value: 'shipped', color: 'green', group_id: 'done' },
        { value: 'archived', color: 'green', group_id: 'done' },
      ],
    },
  ],
}
const CONFIGURED = {
  kind: 'property',
  property_id: 'prop_status',
  order_mode: 'configured',
} as const
const banded = (group: SavedView['group']): CollectionNode =>
  ({ ...collection({ group }), properties: [threeStatus] }) as CollectionNode
const bandKeys = (): string[] =>
  api?.groups.flatMap((g) => (g.kind === 'bucket' ? [g.key] : [])) ?? []

describe('the persist fold', () => {
  it('one save carries a collapse, a style patch, and a resize, the explicit patch winning', async () => {
    await mount(
      collection({
        column_styles: { prop_status: { look: 'compact' } },
        column_widths: { _title: 300 },
      }),
    )
    act(() => api?.toggleCollapse('g1'))
    act(() => api?.setStylePatch('prop_status', 'date_format', 'relative'))
    act(() => void api?.persistView({ column_widths: { prop_status: 120 } }))
    act(() => void api?.persistView({ hide_borders: true, column_widths: { prop_status: 90 } }))
    const saved = lastSavedView()
    expect(saved.collapsed_groups).toEqual(['g1'])
    expect(saved.column_styles?.prop_status).toEqual({ look: 'compact', date_format: 'relative' })
    expect(saved.hide_borders).toBe(true)
    expect(saved.column_widths).toEqual({ _title: 300, prop_status: 90 })
  })

  it("a pick equal to the column's default stores nothing, so the column follows it again", async () => {
    await mount(collection({ column_styles: { prop_status: { look: 'compact' } } }))
    act(() => api?.setStylePatch('prop_status', 'look', 'standard'))
    expect(lastSavedView().column_styles?.prop_status).toEqual({})
  })

  it('a persist fired after a round-trip folds the fire-time live view, not its closure', async () => {
    await mount(collection())
    const early = api?.persistView
    act(() => api?.toggleCollapse('g1'))
    act(() => void early?.({ hide_borders: true }))
    expect(lastSavedView().collapsed_groups).toEqual(['g1'])
    expect(lastSavedView().hide_borders).toBe(true)
  })

  it('F-122: a band order the walker replaced paints and saves as the walker wrote it', async () => {
    await mount(banded(CONFIGURED))
    const configured = bandKeys()
    act(
      () =>
        void api?.persistView({
          group: {
            ...CONFIGURED,
            order_mode: 'manual',
            order: ['shipped', 'complete', 'archived'],
          },
        }),
    )
    expect(bandKeys()).toEqual(['shipped', 'complete', 'archived'])
    await mount(banded({ ...CONFIGURED, order_mode: 'reversed' }))
    expect(bandKeys()).toEqual([...configured].reverse())
    act(() => api?.toggleCollapse('g1'))
    expect(lastSavedView().group).toEqual({ ...CONFIGURED, order_mode: 'reversed' })
  })

  it('D-2: a staged collapse the walker rewrote paints and saves the new key', async () => {
    await mount(collection())
    act(() => api?.toggleCollapse('Old'))
    await mount(collection({ collapsed_groups: ['New'] }))
    expect([...(api?.collapsed ?? [])]).toEqual(['New'])
    act(() => void api?.persistView({}))
    expect(lastSavedView().collapsed_groups).toEqual(['New'])
  })

  it('two collapses before the first save lands never paint the first alone, and the second save carries both', async () => {
    await mount(collection())
    act(() => api?.toggleCollapse('g1'))
    act(() => api?.toggleCollapse('g2'))
    expect(lastSavedView().collapsed_groups).toEqual(['g1', 'g2'])
    await mount(collection({ collapsed_groups: ['g1'] }))
    expect([...(api?.collapsed ?? [])]).toEqual(['g1', 'g2'])
    await mount(collection({ collapsed_groups: ['g1', 'g2'] }))
    expect([...(api?.collapsed ?? [])]).toEqual(['g1', 'g2'])
  })
})

describe('the reset keys', () => {
  it('the stored order paints under default Custom and is ignored under Location', async () => {
    await mount(collection({ manual_order: ['p2', 'p1'] }))
    expect(paintOrder()).toEqual(['p2', 'p1'])
    await mount(collection({ manual_order: ['p2', 'p1'], structural_order_mode: 'location' }))
    expect(paintOrder()).toEqual(['p1', 'p2'])
  })

  it('hide-then-hide: the second write still carries the first', async () => {
    await mount(collection())
    act(() => api?.hideProperty('prop_status'))
    await act(async () => api?.hideProperty('_title'))
    expect(lastSavedView().hidden_properties).toEqual(['prop_status', '_title'])
  })

  it('a staged order and hidden list drop once the stored view carries them', async () => {
    await mount(collection())
    act(() => void api?.persistView({ property_order: ['prop_status', '_title'] }))
    act(() => api?.hideProperty('prop_status'))
    expect(api?.view.property_order).toEqual(['prop_status', '_title'])
    await mount(
      collection({ property_order: ['prop_status', '_title'], hidden_properties: ['prop_status'] }),
    )
    await mount(collection())
    expect(api?.view.property_order).toEqual(['_title', 'prop_status'])
    expect(api?.view.hidden_properties).toEqual([])
  })

  it('sibling sub-Sets sharing the sentinel: navigating A → B resets every staged field, and B first-persists clean', async () => {
    const { a, b } = deepSets()
    await mount(a)
    act(() => void api?.persistView({ property_order: ['prop_status', '_title'] }))
    act(() => api?.setStylePatch('prop_status', 'look', 'label'))
    act(() => api?.toggleCollapse('gA'))
    expect(api?.view.property_order).toEqual(['prop_status', '_title'])
    await mount(b)
    expect(api?.view.property_order).not.toEqual(['prop_status', '_title'])
    expect(api?.collapsed.size).toBe(0)
    saveSpy.mockClear()
    await act(async () => void api?.persistView({}))
    const saved = lastSavedView()
    expect(saved.property_order).not.toEqual(['prop_status', '_title'])
    expect(saved.collapsed_groups).toBeUndefined()
    expect(saved.column_styles?.prop_status).toBeUndefined()
  })
})

describe('the values epoch', () => {
  let vals: ReturnType<typeof useContainerValues> | null = null
  function ValuesProbe({ path }: { path: string }): null {
    vals = useContainerValues(path)
    return null
  }
  const mountValues = async (path = 'Col'): Promise<void> => {
    await act(async () => root.render(<ValuesProbe path={path} />))
    await act(async () => {})
  }
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

  it('an epoch from before the mount, or before a container swap, triggers no second read', async () => {
    act(() => useSession.getState().bumpValuesEpoch('Old', 'New'))
    bump([{ rel: 'Col', pageIds: [] }])
    await mountValues()
    expect(loadValues()).toHaveBeenCalledTimes(1)
    await mountValues('Other')
    expect(loadValues()).toHaveBeenCalledTimes(2)
    bump([{ rel: 'Other', pageIds: [] }])
    await act(async () => {})
    expect(loadValues()).toHaveBeenCalledTimes(3)
  })

  it('an epoch one page passed over is still read for the next page shown', async () => {
    function PageProbe({ pageId }: { pageId: string }): null {
      useValuesEpoch('Col', () => {}, vi.fn(), pageId)
      return null
    }
    await act(async () => root.render(<PageProbe pageId="p1" />))
    bump([{ rel: 'Col', pageIds: ['p2'] }])
    await act(async () => {})
    expect(loadValues()).not.toHaveBeenCalled()
    await act(async () => root.render(<PageProbe pageId="p2" />))
    await act(async () => {})
    expect(loadValues()).toHaveBeenCalledWith('Col', ['p2'])
  })

  it('a container push re-reads only the named pages and retires a settled override while a still-saving one holds', async () => {
    await mountValues()
    channels['view:loadValues'] = vi.fn(async () => ({ ok: true, value: { ...VALUES, ...P2 } }))
    act(() =>
      vals?.setValueOverride({
        p1: { fm: { id: 'p1' } as never, write: new Promise(() => {}) },
        p2: { fm: { id: 'p2' } as never, write: 0 },
      }),
    )
    bump([{ rel: 'Col', pageIds: ['p1', 'p2'] }])
    await act(async () => {})
    expect(loadValues()).toHaveBeenCalledWith('Col', ['p1', 'p2'])
    expect(vals?.effectiveValues.p2).toEqual(P2.p2)
    expect(vals?.effectiveValues.p1?.frontmatter).toEqual({ id: 'p1' })
  })

  it('a full read a container swap discards retires nothing in the new container', async () => {
    await mountValues()
    const lands: ((v: { ok: true; value: typeof VALUES }) => void)[] = []
    channels['view:loadValues'] = vi.fn(() => new Promise((r) => lands.push(r)))
    bump([{ rel: 'Col', pageIds: [] }])
    await act(async () => {})
    await mountValues('Other')
    act(() => vals?.setValueOverride({ p9: { fm: { id: 'p9' } as never, write: 0 } }))
    await act(async () => lands[0]({ ok: true, value: VALUES }))
    expect(vals?.effectiveValues.p9?.frontmatter).toEqual({ id: 'p9' })
  })

  it('a pending full read outlives another container’s push, and keeps a write that landed after it was issued', async () => {
    await mountValues()
    const lands: ((v: { ok: true; value: typeof P2 }) => void)[] = []
    channels['view:loadValues'] = vi.fn(() => new Promise((r) => lands.push(r)))
    bump([{ rel: 'Col', pageIds: [] }])
    await act(async () => {})
    const write = Promise.resolve(true)
    act(() =>
      patchOverride(vals?.setValueOverride ?? (() => {}), 'p2', { id: 'p2' } as never, write),
    )
    await act(async () => write)
    bump([{ rel: 'Other', pageIds: ['p9'] }])
    await act(async () => {})
    await act(async () => lands[0]({ ok: true, value: P2 }))
    expect(vals?.values.p2).toEqual(P2.p2)
    expect(vals?.effectiveValues.p2?.frontmatter).toEqual({ id: 'p2' })
  })

  it('an older full read landing after a newer one is dropped', async () => {
    await mountValues()
    const lands: ((v: { ok: true; value: typeof P2 }) => void)[] = []
    channels['view:loadValues'] = vi.fn(() => new Promise((r) => lands.push(r)))
    bump([{ rel: 'Col', pageIds: [] }])
    await act(async () => {})
    bump([{ rel: 'Col', pageIds: [] }])
    await act(async () => {})
    await act(async () => lands[1]({ ok: true, value: P2 }))
    await act(async () => lands[0]({ ok: true, value: VALUES }))
    expect(vals?.values).toEqual(P2)
  })

  it('a scoped read that lands after a container swap never merges into the new container', async () => {
    await mountValues()
    let land: (v: { ok: true; value: typeof P2 }) => void = () => {}
    channels['view:loadValues'] = vi.fn((_path: string, ids?: string[]) =>
      ids
        ? new Promise((r) => {
            land = r
          })
        : Promise.resolve({ ok: true, value: {} }),
    )
    act(() => vals?.setValueOverride({ p1: { fm: { id: 'p1' } as never, write: 0 } }))
    bump([{ rel: 'Col', pageIds: ['p2'] }])
    await act(async () => {})
    await mountValues('Other')
    await act(async () => {
      land({ ok: true, value: P2 })
    })
    expect(vals?.effectiveValues).toEqual({})
  })

  it('a scoped read that resolves no page retires no override', async () => {
    await mountValues()
    channels['view:loadValues'] = vi.fn(async () => ({ ok: true, value: {} }))
    act(() => vals?.setValueOverride({ p1: { fm: { id: 'p1' } as never, write: 0 } }))
    bump([{ rel: 'Col', pageIds: ['p1'] }])
    await act(async () => {})
    expect(vals?.effectiveValues.p1?.frontmatter).toEqual({ id: 'p1' })
  })

  it('a failed read keeps the values already held', async () => {
    await mountValues()
    channels['view:loadValues'] = vi.fn(async () => ({
      ok: false,
      error: { code: 'operation-failed' },
    }))
    bump([{ rel: 'Col', pageIds: ['p1'] }])
    await act(async () => {})
    expect(vals?.effectiveValues.p1).toEqual(VALUES.p1)
  })

  it('a named override holds until the refetch lands, so the row never paints its fallback, and the refetch merges', async () => {
    await mountValues()
    let land: (v: { ok: true; value: typeof P2 }) => void = () => {}
    channels['view:loadValues'] = vi.fn(
      () => new Promise<{ ok: true; value: typeof P2 }>((r) => (land = r)),
    )
    act(() => vals?.setValueOverride({ p2: { fm: { id: 'p2' } as never, write: 0 } }))
    bump([{ rel: 'Col', pageIds: ['p2'] }])
    await act(async () => {})
    expect(vals?.effectiveValues.p2?.frontmatter).toEqual({ id: 'p2' })
    await act(async () => land({ ok: true, value: P2 }))
    expect(vals?.effectiveValues.p2).toEqual(P2.p2)
    expect(vals?.values.p1).toEqual(VALUES.p1)
  })

  it('a push naming no ids retires the settled override and keeps the pending one', async () => {
    await mountValues()
    act(() =>
      vals?.setValueOverride({
        p1: { fm: { id: 'p1' } as never, write: new Promise(() => {}) },
        p2: { fm: { id: 'p2' } as never, write: 0 },
      }),
    )
    bump([{ rel: 'Col', pageIds: [] }])
    await act(async () => {})
    expect(vals?.effectiveValues.p1?.frontmatter).toEqual({ id: 'p1' })
    expect(vals?.effectiveValues.p2).toBeUndefined()
  })

  it('one push over several containers reaches the mounted one', async () => {
    await mountValues()
    channels['view:loadValues'] = vi.fn(async () => ({ ok: true, value: P2 }))
    act(() => vals?.setValueOverride({ p2: { fm: { id: 'p2' } as never, write: 0 } }))
    bump([
      { rel: 'Other', pageIds: ['p9'] },
      { rel: 'Col', pageIds: ['p2'] },
    ])
    await act(async () => {})
    expect(loadValues()).toHaveBeenCalledTimes(1)
    expect(vals?.effectiveValues.p2).toEqual(P2.p2)
  })

  it('a sibling container push neither refetches nor retires', async () => {
    await mountValues()
    loadValues().mockClear()
    act(() => vals?.setValueOverride({ p2: { fm: { id: 'p2' } as never, write: 0 } }))
    bump([{ rel: 'Other', pageIds: ['p2'] }])
    await act(async () => {})
    expect(loadValues()).not.toHaveBeenCalled()
    expect(vals?.effectiveValues.p2?.frontmatter).toEqual({ id: 'p2' })
  })

  it('a rename re-keys the override instead of clearing it', async () => {
    await mountValues()
    act(() =>
      vals?.setValueOverride({
        p2: { fm: { id: 'p2', Status: ['Done'] } as never, write: 0 },
      }),
    )
    act(() => useSession.getState().bumpValuesEpoch('Status', 'State'))
    await act(async () => {})
    expect(vals?.effectiveValues.p2?.frontmatter).toEqual({ id: 'p2', State: ['Done'] })
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

describe('the cards seam (nests off)', () => {
  it('a type-switched view still carrying sub_group never arms reassign — relocation stays the only cross-band write', async () => {
    const carried = setCollection({
      sub_group: { property_id: 'prop_status', order_mode: 'manual' },
    })
    await mount(carried, false)
    expect(api?.plan.kind === 'sets' && api.plan.sub !== undefined).toBe(false)
    expect(api?.groupPropId).toBeUndefined()
    expect(api?.canReassign).toBe(false)
    expect(api?.canRelocate).toBe(true)
    await mount(carried, true)
    expect(api?.plan.kind === 'sets' && api.plan.sub !== undefined).toBe(true)
    expect(api?.groupPropId).toBe('prop_status')
  })

  it("a Location sort orders pages by folder only where bands don't nest", async () => {
    const located = setCollection({
      group: { kind: 'flat' },
      sort: [{ property_id: LOCATION_SORT, direction: 'asc' }],
    } as unknown as Partial<SavedView>)
    await mount(located, false)
    expect(api?.pageOrder).toBe('location')
    await mount(located, true)
    expect(api?.pageOrder).toBe('custom')
  })

  it('a cards persist mid-collapse keeps the collapse, and a landed style patch yields to a later write', async () => {
    await mount(setCollection(), false)
    act(() => api?.toggleCollapse('sA'))
    await act(async () => void api?.persistView({}))
    expect(lastSavedView().collapsed_groups).toEqual(['sA'])
    act(() => api?.setStylePatch('prop_status', 'look', 'compact'))
    expect(api?.view.column_styles?.prop_status).toEqual({ look: 'compact' })
    await mount(setCollection({ column_styles: { prop_status: { look: 'compact' } } }), false)
    await mount(setCollection(), false)
    expect(api?.view.column_styles).toBeUndefined()
  })
})

describe("the engine's grouping", () => {
  it('a sub_group on a property the engine cannot group by never arms reassign', async () => {
    await mount(setCollection({ sub_group: { property_id: 'prop_gone', order_mode: 'manual' } }))
    expect(api?.plan.kind === 'sets' && api.plan.sub !== undefined).toBe(false)
    expect(api?.groupPropId).toBeUndefined()
    expect(api?.canReassign).toBe(false)
    expect(api?.canRelocate).toBe(true)
  })

  it('a property group the engine paints as Sets reads as structural', async () => {
    await mount(
      setCollection({
        group: { kind: 'property', property_id: 'prop_gone', order_mode: 'configured' },
        manual_order: ['pA', 'pB'],
      }),
    )
    expect(api?.groupPropId).toBeUndefined()
    expect(api?.plan.kind).toBe('sets')
    expect(api?.pageOrder).toBe('custom')
    expect(api?.canReassign).toBe(false)
    expect(api?.canRelocate).toBe(true)
  })
})

const SORTED: Partial<SavedView> = {
  sort: [{ property_id: 'prop_status', direction: 'ascending' }],
}

describe('the manual order fold', () => {
  it('a reorder under a sort rides every later save', async () => {
    await mount(collection(SORTED))
    act(() => void api?.persistView({ manual_order: ['p2', 'p1'] }, { viewState: true }))
    act(() => api?.toggleCollapse('g1'))
    expect(lastSavedView().manual_order).toEqual(['p2', 'p1'])
  })

  it('the crossing: a collapse while a folder move paints ahead saves the stored order untouched', async () => {
    const source = collection({ manual_order: ['p2', 'p1'], structural_order_mode: 'location' })
    let settle: () => void = () => {}
    const pending = new Promise<null>((resolve) => {
      settle = () => resolve(null)
    })
    useSession.setState({
      tree: { collections: [source], contexts: [], config: { personalization: {} } } as never,
      mutate: vi.fn(() => pending) as never,
    })
    await mount(source)
    expect(paintOrder()).toEqual(['p1', 'p2'])
    act(() => void mutateAhead(moveP2First, 'Two'))
    expect(paintOrder()).toEqual(['p2', 'p1'])
    act(() => api?.toggleCollapse('g1'))
    expect(lastSavedView().collapsed_groups).toEqual(['g1'])
    expect(lastSavedView().manual_order).toEqual(['p2', 'p1'])
    await act(async () => settle())
  })

  it('a refused move rolls the paint back', async () => {
    const source = collection({ structural_order_mode: 'location' })
    useSession.setState({
      tree: { collections: [source], contexts: [], config: { personalization: {} } } as never,
      mutate: vi.fn(async () => null) as never,
    })
    await mount(source)
    await act(async () => void mutateAhead(moveP2First, 'Two'))
    expect(paintOrder()).toEqual(['p1', 'p2'])
    expect(document.querySelector('[aria-live="assertive"]')?.textContent).toBe(
      'Two returned to its place.',
    )
  })

  it('two hosts of one Collection, and a Set tile inside it, paint the same pending order', async () => {
    const pages = ['a1', 'a2'].map((id) => page(id, id, `Col/A/${id}.md`))
    const inner = { kind: 'set', id: 'sA', title: 'A', path: 'Col/A', pages, sets: [] }
    const source = {
      ...collection({ structural_order_mode: 'location' }),
      sets: [inner],
    } as unknown as CollectionNode
    let settle: () => void = () => {}
    useSession.setState({
      tree: { collections: [source], contexts: [], config: { personalization: {} } } as never,
      mutate: vi.fn(
        () =>
          new Promise<null>((resolve) => {
            settle = () => resolve(null)
          }),
      ) as never,
    })
    const seen: Record<string, string[]> = {}
    function Twin({ id, of }: { id: string; of: CollectionNode | SetNode }): null {
      const twin = useViewHost(of, true)
      seen[id] = twin?.rows.map((r) => r.id) ?? []
      return null
    }
    await act(async () => {
      root.render(
        <ContentHostContext.Provider value={{ tabId: 't1', key: 'collection:col1', parked: false }}>
          <Twin id="one" of={source} />
          <Twin id="two" of={source} />
          <Twin id="tile" of={inner as unknown as SetNode} />
        </ContentHostContext.Provider>,
      )
    })
    await act(async () => {})
    expect(seen.tile).toEqual(['a1', 'a2'])
    act(
      () =>
        void mutateAhead(
          { op: 'movePage', path: 'Col/A/a2.md', newParentPath: 'Col/A', order: ['a2', 'a1'] },
          'a2',
        ),
    )
    expect(seen.tile).toEqual(['a2', 'a1'])
    expect(seen.one).toEqual(seen.two)
    expect(seen.one).toContain('a2')
    expect(seen.one?.indexOf('a2')).toBeLessThan(seen.one?.indexOf('a1') ?? -1)
    await act(async () => settle())
  })

  it('crossBand is false under two sort keys and under search', async () => {
    const twoKeys: Partial<SavedView> = {
      sort: [
        { property_id: 'prop_status', direction: 'ascending' },
        { property_id: '_title', direction: 'ascending' },
      ],
    }
    await mount(collection({ group: { kind: 'flat' } } as Partial<SavedView>))
    expect(api?.crossBand).toBe(false)
    await mount(setCollection())
    expect(api?.canRelocate).toBe(true)
    expect(api?.crossBand).toBe(true)
    await mount(setCollection(twoKeys))
    expect(api?.sortKeys).toBe(2)
    expect(api?.crossBand).toBe(false)
    await mount(setCollection())
    act(() =>
      useSession.setState({
        viewSearch: { t1: { key: 'collection:col1', query: 'a', summon: 0 } },
      }),
    )
    expect(api?.crossBand).toBe(false)
  })

  it('the stored order paints, a sub-grouped view without a group key included, and a landed order yields to a later write', async () => {
    channels['view:loadValues'] = async () => ({ ok: true, value: {} })
    const subGrouped = { sub_group: { property_id: 'prop_status', order_mode: 'manual' } } as const
    await mount(collection({ ...subGrouped, manual_order: ['p2', 'p1'] }))
    expect(paintOrder()).toEqual(['p2', 'p1'])
    act(() => void api?.persistView({ manual_order: ['p1', 'p2'] }, { viewState: true }))
    expect(paintOrder()).toEqual(['p1', 'p2'])
    await mount(collection({ ...subGrouped, manual_order: ['p1', 'p2'] }))
    await mount(collection({ ...subGrouped, manual_order: ['p2', 'p1'] }))
    expect(paintOrder()).toEqual(['p2', 'p1'])
  })
})

describe('settleOrders — a create composes with the live order', () => {
  const createBelowFirst = async (): Promise<void> => {
    const row = api?.rows[0]
    if (row) await act(async () => void creation.createAdjacent(row, 'below'))
  }

  beforeEach(() => {
    let n = 2
    useSession.setState({
      mutate: vi.fn(async (_req: unknown, then?: (c: { id: string; path: string }) => void) => {
        n += 1
        then?.({ id: `p${n}`, path: `Col/New ${n}.md` })
        return {}
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

  it('the override survives a push that re-identifies its source — only a page_order-backed view resets on it', async () => {
    await mount(collection({ ...SORTED, manual_order: ['p1', 'p2'] }))
    await createBelowFirst()
    expect(api?.view.manual_order).toEqual(['p1', 'p3', 'p2'])
    // A later push hands the view the same content under a new source identity.
    await mount(collection({ ...SORTED, manual_order: ['p1', 'p2'] }))
    expect(api?.view.manual_order).toEqual(['p1', 'p3', 'p2'])
  })

  it("a sorted view's create lands at the folder's Bottom slot and beside its anchor", async () => {
    const source = collection(SORTED)
    useSession.setState((s) => ({ tree: { ...s.tree!, collections: [source] } }))
    const mutate = useSession.getState().mutate as ReturnType<typeof vi.fn>
    await mount(source)
    await act(async () => void creation.createFirst())
    expect(mutate.mock.calls[0][0]).toMatchObject({ order: ['p1', 'p2', '$new'] })
    await createBelowFirst()
    expect(mutate.mock.calls[1][0]).toMatchObject({ order: ['p1', '$new', 'p2'] })
  })

  it('a create under Location page order writes no manual_order, even over a stored one', async () => {
    await mount(collection({ manual_order: ['p1', 'p2'], structural_order_mode: 'location' }))
    saveSpy.mockClear()
    await createBelowFirst()
    expect(saveSpy).not.toHaveBeenCalled()
  })

  it('an unsorted, ungrouped view mints no manual_order where none existed', async () => {
    await mount(collection())
    saveSpy.mockClear()
    await createBelowFirst()
    expect(saveSpy).not.toHaveBeenCalled()
  })
})

describe('the root seat', () => {
  const mountSeat = (source: CollectionNode): Promise<void> => renderView(root, source)
  const mutateSpy = (): ReturnType<typeof vi.fn> =>
    useSession.getState().mutate as unknown as ReturnType<typeof vi.fn>
  const clickGhost = async (selector: string): Promise<void> => {
    const ghost = host.querySelector<HTMLElement>(selector)
    expect(ghost).toBeTruthy()
    await act(async () => ghost?.click())
  }

  it('paints nothing while the host is null', async () => {
    useSession.setState({ tree: null as never })
    await mountSeat(collection())
    expect(host.textContent).toBe('')
  })

  it('an empty container paints its head and one standing ghost row, which creates the first page', async () => {
    const empty = collection()
    ;(empty as unknown as { pages: unknown[] }).pages = []
    await mountSeat(empty)
    expect(host.querySelector('.table-head')).toBeTruthy()
    expect(host.querySelectorAll('.ghost-row').length).toBe(1)
    expect(host.querySelectorAll('.data-row:not(.ghost-row)').length).toBe(0)
    await clickGhost('.ghost-row')
    expect(mutateSpy()).toHaveBeenCalledWith(
      expect.objectContaining({ op: 'createPage', parentPath: 'Col' }),
      expect.any(Function),
    )
  })

  it('the standing ghost claims its create for the flight, so a double click mints one page', async () => {
    const empty = collection()
    ;(empty as unknown as { pages: unknown[] }).pages = []
    useSession.setState({ mutate: vi.fn(() => new Promise<unknown>(() => {})) as never })
    await mountSeat(empty)
    await clickGhost('.ghost-row')
    await clickGhost('.ghost-row')
    expect(mutateSpy()).toHaveBeenCalledTimes(1)
  })

  it('a filter that hides every page stands no ghost — the container is not the empty one', async () => {
    await mountSeat(
      collection({
        filter: {
          match: 'all',
          rules: [{ property_id: 'prop_status', op: 'is', value: 'archived' }],
        },
      } as unknown as Partial<SavedView>),
    )
    expect(host.querySelectorAll('.data-row').length).toBe(0)
    expect(host.querySelector('.ghost-row')).toBeFalsy()
  })

  it('a cards view over Sets holding no pages mounts the renderer with a standing ghost card', async () => {
    const source = setCollection({
      hide_empty_groups: true,
      set_cards: false,
    } as unknown as Partial<SavedView>)
    ;(source as unknown as { pages: unknown[] }).pages = []
    ;(source.sets?.[0] as unknown as { pages: unknown[] }).pages = []
    useSession.setState({
      tree: makeTree(),
    })
    await mountSeat(source)
    expect(host.querySelector('.cards-view')).toBeTruthy()
    expect(host.querySelectorAll('.ghost-card').length).toBe(1)
  })
})

describe('view search', () => {
  const search = (query: string): void =>
    useSession.setState({ viewSearch: { t1: { key: 'collection:col1', query, summon: 0 } } })

  it('narrows the groups, the lookups, and the count to title matches, dropping every group left empty', async () => {
    search('loose')
    await mount(setCollection())
    expect(api?.groups.map((g) => g.kind)).toEqual(['tail'])
    expect([...(api?.rowById.keys() ?? [])]).toEqual(['pLoose'])
    expect(api?.paintOrder.map((r) => r.id)).toEqual(['pLoose'])
    act(() => search('in a'))
    expect(api?.paintOrder.map((r) => r.id)).toEqual(['pA'])
  })

  it('shows every kept group open, ignores the chevron, and leaves the saved collapse alone', async () => {
    await mount(setCollection({ collapsed_groups: ['sA'] }))
    expect(api?.collapsed.has('sA')).toBe(true)
    act(() => search('in a'))
    expect(api?.collapsed.size).toBe(0)
    saveSpy.mockClear()
    act(() => api?.toggleCollapse('sA'))
    expect(saveSpy).not.toHaveBeenCalled()
    act(() => search(''))
    expect(api?.collapsed.has('sA')).toBe(true)
  })

  it('turns row drag off only while a query is active', async () => {
    await mount(collection())
    expect(api?.searching).toBe(false)
    expect(api?.dragDisabled).toBe(false)
    act(() => search('one'))
    expect(api?.searching).toBe(true)
    expect(api?.dragDisabled).toBe(true)
  })

  it('leaves a view tile unsearched', async () => {
    search('tw')
    const source = collection()
    await act(async () => {
      root.render(
        <ViewTileScopeProvider
          value={{
            source,
            view: source.views?.[0] as SavedView,
            persist: vi.fn(),
            locked: false,
            setLocked: vi.fn(),
          }}
        >
          <Probe source={source} nests />
        </ViewTileScopeProvider>,
      )
    })
    await act(async () => {})
    expect(api?.paintOrder.map((r) => r.id)).toEqual(['p1', 'p2'])
  })
})

describe('the value writer', () => {
  it('a Context edit paints on its row while the save is in flight, and leaves the frontmatter as loaded', async () => {
    useSession.setState({
      tree: { collections: [collection()], contexts: [], config: { personalization: {} } } as never,
      mutate: vi.fn(() => new Promise(() => {})) as never,
    })
    await mount(collection())
    const row = api?.rowById.get('p1')
    if (!row) throw new Error('row p1 missing')
    act(() => {
      api?.commitValue(row, { id: 'ctx1', kind: 'context' }, { kind: 'context', value: ['s1'] })
    })
    expect(api?.rowById.get('p1')?.contextValues).toEqual({ ctx1: ['s1'] })
    expect(api?.rowById.get('p1')?.frontmatter).toEqual(VALUES.p1?.frontmatter)
  })
})
