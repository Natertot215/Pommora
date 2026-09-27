// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { act, useEffect } from 'react'
import type { Root } from 'react-dom/client'
import type { CollectionNode } from '@pommora/core/Nexus/tree'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import type { SavedView } from '@pommora/core/Views/views'
import { useSession } from '../Session/store'
import { GroupFrame } from './Settings/GroupFrame'
import { SettingsFrame } from './Settings/SettingsFrame'
import { ViewTileScopeProvider, type ViewTileScopeValue } from './ViewTileScope'
import { resolveViewWrite, saveViewIn, useSaveView, VIEW_CONFIG_LOCKED } from './viewWrite'
import { stubDialer } from '../vitest.setup'
import { mountEachTest } from '../Testing/viewHarness'
import { useActiveView } from './Host/useActiveView'

const statusDef: PropertyDefinition = {
  id: 'prop_status',
  name: 'Status',
  type: 'status',
  status_groups: [
    {
      id: 'g1',
      label: 'Open',
      color: 'gray',
      options: [{ value: 'todo', group_id: 'g1' }],
    },
  ],
}

const source = {
  kind: 'collection',
  id: 'col1',
  title: 'Col',
  path: 'Col',
  sets: [],
  pages: [],
  properties: [statusDef],
} as unknown as CollectionNode

const view: SavedView = {
  id: 'view_01J0000000000000000000000A',
  name: 'Tile View',
  type: 'table',
  property_order: ['_title'],
  hidden_properties: [],
  group: { kind: 'structural' },
}

let host: HTMLDivElement
let root: Root
mountEachTest((h, r) => {
  host = h
  root = r
})
let persist: Mock<(patch: Partial<SavedView>) => void>
let sourceSave: Mock

const scope = (locked: boolean): ViewTileScopeValue => ({
  source,
  view,
  persist,
  locked,
  setLocked: vi.fn(),
})

const render = (node: React.ReactNode): Promise<void> =>
  act(async () => {
    root.render(node)
  })

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
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'views:save': sourceSave,
  })
  useSession.setState({ load: vi.fn(async () => {}) as never })
})

function Probe({ onResult }: { onResult: (r: unknown) => void }): null {
  const save = useSaveView(source)
  useEffect(() => {
    void save(view, { name: 'Renamed' }).then(onResult)
  }, [save, onResult])
  return null
}

function StateProbe({ onResult }: { onResult: (r: unknown) => void }): null {
  const save = useSaveView(source)
  useEffect(() => {
    void save(
      view,
      { collapsed_groups: ['Done'], column_widths: { _title: 420 } },
      { viewState: true },
    ).then(onResult)
  }, [save, onResult])
  return null
}

describe('a locked view-embed scope', () => {
  it('answers the write with a refusal instead of a fake success', async () => {
    const results: unknown[] = []
    await render(
      <ViewTileScopeProvider value={scope(true)}>
        <Probe onResult={(r) => results.push(r)} />
      </ViewTileScopeProvider>,
    )
    expect(results).toEqual([
      { ok: false, error: { code: 'operation-failed', message: VIEW_CONFIG_LOCKED } },
    ])
    expect(persist).not.toHaveBeenCalled()
  })

  it('persists through the payload writer when unlocked', async () => {
    const results: unknown[] = []
    await render(
      <ViewTileScopeProvider value={scope(false)}>
        <Probe onResult={(r) => results.push(r)} />
      </ViewTileScopeProvider>,
    )
    expect(results).toEqual([{ ok: true, value: { id: view.id } }])
    expect(persist).toHaveBeenCalledWith({ name: 'Renamed' })
  })

  it('lets a collapse through — the lock freezes config, not how you are reading the tile', async () => {
    const results: unknown[] = []
    await render(
      <ViewTileScopeProvider value={scope(true)}>
        <StateProbe onResult={(r) => results.push(r)} />
      </ViewTileScopeProvider>,
    )
    expect(results).toEqual([{ ok: true, value: { id: view.id } }])
    expect(persist).toHaveBeenCalledWith({ collapsed_groups: ['Done'] })
  })

  it('narrows a state write to the state keys, so a refused override cannot ride along', async () => {
    await render(
      <ViewTileScopeProvider value={scope(true)}>
        <StateProbe onResult={() => {}} />
      </ViewTileScopeProvider>,
    )
    expect(persist.mock.calls).toEqual([[{ collapsed_groups: ['Done'] }]])
  })

  it('drops nothing to the source container either', async () => {
    await render(
      <ViewTileScopeProvider value={scope(true)}>
        <GroupFrame
          source={source}
          view={view}
          schema={[statusDef]}
          label="Settings"
          onBack={() => {}}
        />
      </ViewTileScopeProvider>,
    )
    await clickRow('Group By')
    await clickRow('Status', 'last')
    expect(persist).not.toHaveBeenCalled()
    expect(sourceSave).not.toHaveBeenCalled()
  })

  it('closes the config leaves in the settings pane, so there is nothing to author into', async () => {
    await render(
      <ViewTileScopeProvider value={scope(true)}>
        <SettingsFrame />
      </ViewTileScopeProvider>,
    )
    await clickRow('Group')
    expect(texts()).not.toContain('Group By')
  })

  it('opens them when unlocked', async () => {
    await render(
      <ViewTileScopeProvider value={scope(false)}>
        <SettingsFrame />
      </ViewTileScopeProvider>,
    )
    await clickRow('Group')
    expect(texts()).toContain('Group By')
  })

  it('offers Filter, whose rules belong to the view the tile carries', async () => {
    await render(
      <ViewTileScopeProvider value={scope(false)}>
        <SettingsFrame />
      </ViewTileScopeProvider>,
    )
    expect(texts()).toContain('Filter')
  })

  it('withholds Configuration, which would write the source container', async () => {
    await render(
      <ViewTileScopeProvider value={scope(false)}>
        <SettingsFrame />
      </ViewTileScopeProvider>,
    )
    expect(texts()).not.toContain('Configuration')
  })
})

describe('saveViewIn — the write every settings frame routes through', () => {
  it('lands a scoped write on the tile payload, never the source', async () => {
    const res = await saveViewIn(scope(false), source, view, { name: 'Renamed' })
    expect(res).toEqual({ ok: true, value: { id: view.id } })
    expect(persist).toHaveBeenCalledWith({ name: 'Renamed' })
    expect(sourceSave).not.toHaveBeenCalled()
  })

  it('refuses a scoped write while the tile is locked', async () => {
    const res = await saveViewIn(scope(true), source, view, { name: 'Renamed' })
    expect(res).toEqual({
      ok: false,
      error: { code: 'operation-failed', message: VIEW_CONFIG_LOCKED },
    })
    expect(persist).not.toHaveBeenCalled()
    expect(sourceSave).not.toHaveBeenCalled()
  })

  it('a refused write paints nothing on the locked tile', async () => {
    let live: SavedView = view
    function Shown(): null {
      live = useActiveView(source, [statusDef])
      return null
    }
    await render(
      <ViewTileScopeProvider value={scope(true)}>
        <Shown />
      </ViewTileScopeProvider>,
    )
    await act(async () => {
      await saveViewIn(scope(true), source, view, { name: 'Renamed' })
    })
    expect(live.name).toBe(view.name)
  })

  it('falls through to the source when nothing scopes it', async () => {
    await saveViewIn(null, source, view, { name: 'Renamed' })
    expect(sourceSave).toHaveBeenCalled()
    expect(persist).not.toHaveBeenCalled()
  })

  it('a second write before the first lands carries the first, whatever view its caller drew', async () => {
    const shown = { ...source, views: [view] } as CollectionNode
    let save: ReturnType<typeof useSaveView> = async () => ({ ok: true, value: { id: '' } })
    function Shown(): null {
      useActiveView(shown, [statusDef])
      save = useSaveView(shown)
      return null
    }
    await render(<Shown />)
    await act(async () => {
      await save(view, { name: 'Renamed' })
      await save(view, { type: 'cards' })
    })
    expect(sourceSave.mock.calls.at(-1)?.[2]).toMatchObject({ name: 'Renamed', type: 'cards' })
  })
})

describe('resolveViewWrite — the one lock-write gate', () => {
  it('writes the whole patch when unlocked', () => {
    expect(resolveViewWrite(false, { name: 'Renamed' })).toEqual({ name: 'Renamed' })
  })
  it('refuses a config write while locked', () => {
    expect(resolveViewWrite(true, { name: 'Renamed' })).toBeNull()
  })
  it('folds a state-only write while locked, dropping config keys like name', () => {
    const write = resolveViewWrite(
      true,
      { name: 'Renamed', collapsed_groups: ['Done'] },
      { viewState: true },
    )
    expect(write).toEqual({ collapsed_groups: ['Done'] })
  })
  it('a locked tile still carries a manual order through the state-only write', () => {
    const write = resolveViewWrite(
      true,
      { name: 'Renamed', manual_order: ['p2', 'p1'] },
      { viewState: true },
    )
    expect(write).toEqual({ manual_order: ['p2', 'p1'] })
  })
})
