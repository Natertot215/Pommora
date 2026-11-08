// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { act } from 'react'
import type { Root } from 'react-dom/client'
import type { CollectionNode } from '../../Nexus/tree'
import type { PropertyDefinition } from '../../Properties/properties'
import { DEFAULT_VIEW_ID, type SavedView, foldView, slotsOf, type ViewPatch } from '../views'
import { mountEachTest } from '../../Testing/viewHarness'
import { dropIO, useActiveView, useLiveView, useSaveView, type ViewWriteOpts } from './liveView'
import { fault, ok } from '../../Contract/result'
import { useSession } from '../../Session/store'
import { stubDialer } from '../../vitest.setup'
import { ViewTileScopeProvider, type ViewTileScopeValue } from '../ViewTileScope'
import { GroupFrame } from '../Settings/GroupFrame'
import { SettingsFrame } from '../Settings/SettingsFrame'

const base = (over: Partial<SavedView> = {}): SavedView =>
  ({
    id: 'view_1',
    name: 'Table',
    type: 'table',
    property_order: ['_title'],
    hidden_properties: [],
    ...over,
  }) as SavedView

let host: HTMLDivElement
let root: Root
mountEachTest((h, r) => {
  host = h
  root = r
})

const render = (node: React.ReactNode): Promise<void> =>
  act(async () => {
    root.render(node)
  })

const containerOf = (id: string): CollectionNode =>
  ({
    kind: 'collection',
    id,
    title: 'Col',
    path: 'Col',
    sets: [],
    pages: [],
  }) as unknown as CollectionNode

let live: SavedView
let stage: (patch: ViewPatch) => void
let renders = 0

function Probe({ view, sourceId }: { view: SavedView; sourceId: string }): null {
  live = useLiveView(sourceId, view)
  const save = useSaveView(containerOf(sourceId))
  stage = (patch) => void save(view, patch)
  renders++
  return null
}

const show = (view: SavedView, sourceId = 'k'): Promise<void> =>
  render(
    <ViewTileScopeProvider
      value={{
        source: containerOf(sourceId),
        view,
        persist: () => {},
        locked: false,
        setLocked: () => {},
      }}
    >
      <Probe view={view} sourceId={sourceId} />
    </ViewTileScopeProvider>,
  )
const put = (patch: ViewPatch): Promise<void> => act(async () => stage(patch))

beforeEach(() => {
  renders = 0
})

describe('a whole field', () => {
  it('drops when the stored value becomes the staged one', async () => {
    await show(base())
    await put({ collapsed_groups: ['a'] })
    await show(base({ collapsed_groups: ['a'] }))
    await show(base({ collapsed_groups: ['b'] }))
    expect(live.collapsed_groups).toEqual(['b'])
  })

  it('a stage captured before the view changed stages over the view as it is now', async () => {
    await show(base())
    const captured = stage
    await show(base({ collapsed_groups: ['x'] }))
    await act(async () => captured({ collapsed_groups: ['a'] }))
    await show(base({ collapsed_groups: ['x'] }))
    expect(live.collapsed_groups).toEqual(['a'])
  })

  it('stays while the stored value is its base', async () => {
    await show(base({ collapsed_groups: ['x'] }))
    await put({ collapsed_groups: ['a'] })
    await show(base({ collapsed_groups: ['x'] }))
    expect(live.collapsed_groups).toEqual(['a'])
  })

  it('drops when the stored value becomes a third value', async () => {
    await show(base())
    await put({ collapsed_groups: ['a'] })
    await show(base({ collapsed_groups: ['walker'] }))
    expect(live.collapsed_groups).toEqual(['walker'])
  })

  it('a second stage before the first lands survives the first landing and drops on its own', async () => {
    await show(base())
    await put({ collapsed_groups: ['a'] })
    await put({ collapsed_groups: ['a', 'b'] })
    await show(base({ collapsed_groups: ['a'] }))
    expect(live.collapsed_groups).toEqual(['a', 'b'])
    await show(base({ collapsed_groups: ['a', 'b'] }))
    await show(base({ collapsed_groups: ['c'] }))
    expect(live.collapsed_groups).toEqual(['c'])
  })

  it('a staged clear paints the field cleared, entries included, until the clear lands', async () => {
    await show(base({ column_widths: { a: 100 }, hide_borders: true }))
    await put({ column_widths: { a: 150 } })
    await put({ column_widths: undefined, hide_borders: undefined })
    expect(live.column_widths).toBeUndefined()
    expect(live.hide_borders).toBeUndefined()
    await show(base())
    await show(base({ hide_borders: true }))
    expect(live.hide_borders).toBe(true)
  })

  it('a run back to its start settles when the start lands and never masks a later write', async () => {
    await show(base({ collapsed_groups: [] }))
    await put({ collapsed_groups: ['a'] })
    await put({ collapsed_groups: [] })
    await show(base({ collapsed_groups: ['a'] }))
    expect(live.collapsed_groups).toEqual([])
    await show(base({ collapsed_groups: [] }))
    await show(base({ collapsed_groups: ['a'] }))
    expect(live.collapsed_groups).toEqual(['a'])
  })

  it('a take-back removes its own stage alone, so a stage made over it keeps painting', async () => {
    await show(base())
    const riding = (patch: ViewPatch) => {
      let land: (landed: boolean) => void = () => {}
      const io = dropIO(
        { id: 'a', name: 'Row' },
        { source: { id: 'k' }, view: base(), persistView: vi.fn() },
      )
      io.persistAfter(
        patch,
        new Promise((resolve) => {
          land = resolve
        }),
      )
      return () => act(async () => land(false))
    }
    let refuseFirst = async (): Promise<void> => {}
    let refuseSecond = async (): Promise<void> => {}
    await act(async () => {
      refuseFirst = riding({ collapsed_groups: ['a'] })
    })
    await act(async () => {
      refuseSecond = riding({ collapsed_groups: ['a', 'b'] })
    })
    await refuseFirst()
    expect(live.collapsed_groups).toEqual(['a', 'b'])
    await refuseSecond()
    expect(live.collapsed_groups).toBeUndefined()
  })

  it('three toggles paint the last through every landing, in order', async () => {
    await show(base({ collapsed_groups: [] }))
    await put({ collapsed_groups: ['a'] })
    await put({ collapsed_groups: [] })
    await put({ collapsed_groups: ['a'] })
    for (const landed of [['a'], [], ['a']]) {
      await show(base({ collapsed_groups: landed }))
      expect(live.collapsed_groups).toEqual(['a'])
    }
    await show(base({ collapsed_groups: ['z'] }))
    expect(live.collapsed_groups).toEqual(['z'])
  })
})

describe('the column records', () => {
  it('settle per entry: one column landing leaves the other staged', async () => {
    await show(base())
    await put({ column_widths: { a: 100 } })
    await put({ column_widths: { b: 200 } })
    await show(base({ column_widths: { b: 200 } }))
    expect(live.column_widths).toEqual({ a: 100, b: 200 })
    await show(base({ column_widths: { a: 100, b: 200 } }))
    await show(base({ column_widths: { a: 90, b: 180 } }))
    expect(live.column_widths).toEqual({ a: 90, b: 180 })
  })

  it('a column_styles entry folds as a whole entry', async () => {
    await show(base({ column_styles: { a: { look: 'compact', date_format: 'short' }, b: {} } }))
    await put({ column_styles: { a: { look: 'compact', date_format: 'full' } } })
    expect(live.column_styles).toEqual({ a: { look: 'compact', date_format: 'full' }, b: {} })
  })

  it("a persist of one column's width carries every other column's stored width", () => {
    const view = base({ column_widths: { a: 100, b: 200 } })
    const saved = foldView(view, slotsOf({ column_widths: { a: 150 } }))
    expect(saved.column_widths).toEqual({ a: 150, b: 200 })
  })
})

describe('the hook', () => {
  it('a change of source drops every slot', async () => {
    await show(base())
    await put({ collapsed_groups: ['a'], column_widths: { a: 100 } })
    await show(base(), 'other')
    expect(live.collapsed_groups).toBeUndefined()
    expect(live.column_widths).toBeUndefined()
  })

  it('an unchanged settle keeps the record, so it schedules no second render', async () => {
    await show(base())
    await put({ collapsed_groups: ['a'] })
    renders = 0
    await show(base())
    expect(renders).toBe(1)
    expect(live.collapsed_groups).toEqual(['a'])
  })
})

describe("a view patch riding a drop's write", () => {
  const ride = async (saves: boolean) => {
    let land: (landed: boolean) => void = () => {}
    const persistView = vi.fn(async () => (saves ? ok({}) : fault('Refused.')))
    await show(base())
    const io = dropIO({ id: 'a', name: 'Row' }, { source: { id: 'k' }, view: base(), persistView })
    await act(async () =>
      io.persistAfter(
        { group_order: ['a'] },
        new Promise((resolve) => {
          land = resolve
        }),
      ),
    )
    return { land: (landed: boolean) => act(async () => land(landed)), persistView }
  }

  it('paints with the ask and saves once the write lands', async () => {
    const { land, persistView } = await ride(true)
    expect(live.group_order).toEqual(['a'])
    expect(persistView).not.toHaveBeenCalled()
    await land(true)
    expect(persistView).toHaveBeenCalledWith({ group_order: ['a'] }, undefined)
    expect(live.group_order).toEqual(['a'])
  })

  it('a refused write takes the paint back unsaved', async () => {
    const { land, persistView } = await ride(true)
    await land(false)
    expect(persistView).not.toHaveBeenCalled()
    expect(live.group_order).toBeUndefined()
  })

  it('a refused save takes the paint back', async () => {
    const { land } = await ride(false)
    await land(true)
    expect(live.group_order).toBeUndefined()
  })

  it('saves the order as the view shows it at landing, keeping a write composed on it since', async () => {
    const { land, persistView } = await ride(true)
    await put({ group_order: ['a', 'b'] })
    await land(true)
    expect(persistView).toHaveBeenCalledWith({ group_order: ['a', 'b'] }, undefined)
    expect(live.group_order).toEqual(['a', 'b'])
  })

  it('a refused drop that a later write composed over returns its row to its prior slot', async () => {
    const prior = base({ group_order: ['a', 'b', 'c'] })
    let land: (landed: boolean) => void = () => {}
    const persistView = vi.fn(async () => ok({}))
    await show(prior)
    const io = dropIO({ id: 'c', name: 'Row' }, { source: { id: 'k' }, view: prior, persistView })
    await act(async () =>
      io.persistAfter(
        { group_order: ['c', 'a', 'b'] },
        new Promise((resolve) => {
          land = resolve
        }),
      ),
    )
    await put({ group_order: ['c', 'b', 'a'] })
    await act(async () => land(false))
    expect(persistView).toHaveBeenCalledWith({ group_order: ['b', 'a', 'c'] }, undefined)
  })
})

describe('useActiveView', () => {
  const view = (id: string): SavedView => base({ id, name: id })
  let seen: SavedView
  function Active({ node }: { node: CollectionNode }): null {
    seen = useActiveView(node)
    return null
  }
  const mount = (over: Partial<CollectionNode>): Promise<void> =>
    render(<Active node={{ ...containerOf('col1'), ...over }} />)

  it("takes the sidecar's active view when it names a saved view", async () => {
    await mount({ views: [view('view_a'), view('view_b')], activeView: 'view_b' })
    expect(seen.id).toBe('view_b')
  })

  it('falls back to the first saved view when the active view names none', async () => {
    await mount({ views: [view('view_a'), view('view_b')], activeView: 'view_gone' })
    expect(seen.id).toBe('view_a')
  })

  it('falls back to the first saved view when the sidecar names none', async () => {
    await mount({ views: [view('view_a'), view('view_b')] })
    expect(seen.id).toBe('view_a')
  })

  it('yields the sentinel for a container holding no views', async () => {
    await mount({ views: undefined })
    expect(seen.id).toBe(DEFAULT_VIEW_ID)
  })
})

describe('useSaveView', () => {
  const statusDef: PropertyDefinition = {
    id: 'prop_status',
    label: 'Status',
    key: 'Status',
    type: 'status',
    status_groups: [
      {
        id: 'g1',
        label: 'Open',
        color: 'gray',
        options: [{ id: 'opt_todo', key: 'todo', label: 'todo' }],
      },
    ],
  }
  const source = { ...containerOf('col1'), propertyIds: [statusDef.id] } as CollectionNode
  const view: SavedView = {
    id: 'view_01J0000000000000000000000A',
    name: 'Tile View',
    type: 'table',
    property_order: ['_title'],
    hidden_properties: [],
    group: { kind: 'structural' },
  }
  let persist: Mock<(patch: Partial<SavedView>) => void>
  let sourceSave: Mock
  const scope = (locked: boolean): ViewTileScopeValue => ({
    source,
    view,
    persist,
    locked,
    setLocked: vi.fn(),
  })
  let save: ReturnType<typeof useSaveView>
  function Saver(): null {
    save = useSaveView(source)
    return null
  }
  const saveIn = async (
    scoped: ViewTileScopeValue | null,
    patch: ViewPatch,
    opts?: ViewWriteOpts,
  ): Promise<unknown> => {
    await render(
      scoped ? (
        <ViewTileScopeProvider value={scoped}>
          <Saver />
        </ViewTileScopeProvider>
      ) : (
        <Saver />
      ),
    )
    let result: unknown
    await act(async () => {
      result = await save(view, patch, opts)
    })
    return result
  }
  const texts = (): string => host.textContent ?? ''
  const clickRow = (label: string, which: 'first' | 'last' = 'first'): Promise<void> => {
    const matches = [...host.querySelectorAll('*')].filter((el) => el.textContent === label)
    const el = which === 'last' ? matches.at(-1) : matches[0]
    return act(async () => {
      ;(el?.closest('[class]') as HTMLElement | null)?.click()
    })
  }

  beforeEach(() => {
    persist = vi.fn()
    sourceSave = vi.fn(async () => ({ ok: true, value: { id: view.id } }))
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({ 'views:save': sourceSave })
    useSession.setState({ load: vi.fn(async () => {}) as never })
  })

  it('a locked tile answers a config write with a refusal and writes nothing', async () => {
    expect(await saveIn(scope(true), { name: 'Renamed' })).toMatchObject({ ok: false })
    expect(persist).not.toHaveBeenCalled()
    expect(sourceSave).not.toHaveBeenCalled()
  })

  it('an unlocked tile lands the write on its payload, never the source', async () => {
    expect(await saveIn(scope(false), { name: 'Renamed' })).toEqual(ok({ id: view.id }))
    expect(persist).toHaveBeenCalledWith({ name: 'Renamed' })
    expect(sourceSave).not.toHaveBeenCalled()
  })

  it('a locked tile folds a state write narrowed to its state keys, manual order beside collapse', async () => {
    const patch = {
      name: 'Renamed',
      collapsed_groups: ['Done'],
      manual_order: ['p2', 'p1'],
      column_widths: { _title: 420 },
    }
    expect(await saveIn(scope(true), patch, { viewState: true })).toEqual(ok({ id: view.id }))
    expect(persist.mock.calls).toEqual([
      [{ collapsed_groups: ['Done'], manual_order: ['p2', 'p1'] }],
    ])
  })

  it('a refused write paints nothing on the locked tile', async () => {
    let shown: SavedView = view
    function Shown(): null {
      shown = useActiveView(source)
      save = useSaveView(source)
      return null
    }
    await render(
      <ViewTileScopeProvider value={scope(true)}>
        <Shown />
      </ViewTileScopeProvider>,
    )
    await act(async () => {
      await save(view, { name: 'Renamed' })
    })
    expect(shown.name).toBe(view.name)
  })

  it('falls through to the source when nothing scopes it', async () => {
    await saveIn(null, { name: 'Renamed' })
    expect(sourceSave).toHaveBeenCalled()
    expect(persist).not.toHaveBeenCalled()
  })

  it('a second write before the first lands carries the first, whatever view its caller drew', async () => {
    const held = { ...source, views: [view] } as CollectionNode
    function Shown(): null {
      useActiveView(held)
      save = useSaveView(held)
      return null
    }
    await render(<Shown />)
    await act(async () => {
      await save(view, { name: 'Renamed' })
      await save(view, { type: 'cards' })
    })
    expect(sourceSave.mock.calls.at(-1)?.[2]).toMatchObject({ name: 'Renamed', type: 'cards' })
  })

  it('a locked tile drops nothing to the source container either', async () => {
    await render(
      <ViewTileScopeProvider value={scope(true)}>
        <GroupFrame
          source={source}
          view={view}
          schema={[statusDef]}
          back={{ label: 'Settings', onBack: () => {} }}
        />
      </ViewTileScopeProvider>,
    )
    await clickRow('Group By')
    await clickRow('Status', 'last')
    expect(persist).not.toHaveBeenCalled()
    expect(sourceSave).not.toHaveBeenCalled()
  })

  it('a locked tile closes the config leaves in the settings pane, so there is nothing to author into', async () => {
    await render(
      <ViewTileScopeProvider value={scope(true)}>
        <SettingsFrame />
      </ViewTileScopeProvider>,
    )
    await clickRow('Group')
    expect(texts()).not.toContain('Group By')
  })

  it('an unlocked tile opens them, Filter among them', async () => {
    await render(
      <ViewTileScopeProvider value={scope(false)}>
        <SettingsFrame />
      </ViewTileScopeProvider>,
    )
    expect(texts()).toContain('Filter')
    await clickRow('Group')
    expect(texts()).toContain('Group By')
  })
})
