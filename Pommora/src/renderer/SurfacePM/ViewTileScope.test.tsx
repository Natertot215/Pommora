// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { CollectionNode } from '@shared/types'
import type { PropertyDefinition } from '@shared/properties'
import type { SavedView, ViewState } from '@shared/views'
import { useSession } from '@renderer/store'
import { GroupFrame } from '@renderer/Frames/GroupFrame'
import { SettingsFrame } from '@renderer/Frames/SettingsFrame'
import {
  resolveViewWrite,
  useSaveView,
  VIEW_CONFIG_LOCKED,
  ViewTileScopeProvider,
  type ViewTileScopeValue,
} from './ViewTileScope'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

const statusDef: PropertyDefinition = {
  id: 'prop_status',
  name: 'Status',
  type: 'status',
  status_groups: [
    {
      id: 'g1',
      label: 'Open',
      color: 'gray',
      options: [{ value: 'todo', label: 'Todo', group_id: 'g1' }],
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
  id: 'embed:blk1:0',
  name: 'Tile View',
  type: 'table',
  property_order: ['_title'],
  hidden_properties: [],
  group: { kind: 'structural' },
}

let host: HTMLDivElement
let root: Root
let persistConfig: Mock<(next: SavedView) => void>
let persistState: Mock<(next: ViewState) => void>
let sourceSave: Mock

const scope = (locked: boolean): ViewTileScopeValue => ({
  source,
  view,
  persistConfig,
  persistState,
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
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  persistConfig = vi.fn()
  persistState = vi.fn()
  sourceSave = vi.fn(async () => ({ ok: true, value: { id: view.id } }))
  ;(window as unknown as { nexus: unknown }).nexus = {
    views: { save: sourceSave },
    activeViews: { set: vi.fn(async () => {}) },
    showError: vi.fn(async () => {}),
  }
  useSession.setState({ load: vi.fn(async () => {}) as never })
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

function Probe({ onResult }: { onResult: (r: unknown) => void }): null {
  const save = useSaveView(source)
  useEffect(() => {
    void save({ ...view, name: 'Renamed' }).then(onResult)
  }, [save, onResult])
  return null
}

function StateProbe({ onResult }: { onResult: (r: unknown) => void }): null {
  const save = useSaveView(source)
  useEffect(() => {
    void save(
      { ...view, collapsed_groups: ['Done'], column_widths: { _title: 420 } },
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
    expect(persistConfig).not.toHaveBeenCalled()
  })

  it('persists through the payload writer when unlocked', async () => {
    const results: unknown[] = []
    await render(
      <ViewTileScopeProvider value={scope(false)}>
        <Probe onResult={(r) => results.push(r)} />
      </ViewTileScopeProvider>,
    )
    expect(results).toEqual([{ ok: true, value: { id: view.id } }])
    expect(persistConfig).toHaveBeenCalledWith({ ...view, name: 'Renamed' })
  })

  it('lets a collapse through — the lock freezes config, not how you are reading the tile', async () => {
    const results: unknown[] = []
    await render(
      <ViewTileScopeProvider value={scope(true)}>
        <StateProbe onResult={(r) => results.push(r)} />
      </ViewTileScopeProvider>,
    )
    expect(results).toEqual([{ ok: true, value: { id: view.id } }])
    expect(persistState).toHaveBeenCalledWith({ collapsed_groups: ['Done'] })
  })

  it('narrows a state write to the state keys, so a refused override cannot ride along', async () => {
    await render(
      <ViewTileScopeProvider value={scope(true)}>
        <StateProbe onResult={() => {}} />
      </ViewTileScopeProvider>,
    )
    expect(persistState).toHaveBeenCalledWith({ collapsed_groups: ['Done'] })
    expect(persistConfig).not.toHaveBeenCalled()
  })

  it('drops nothing to the source container either', async () => {
    await render(
      <ViewTileScopeProvider value={scope(true)}>
        <GroupFrame
          source={source}
          view={view}
          schema={[statusDef]}
          label="Settings"
          subGrouping
          onBack={() => {}}
        />
      </ViewTileScopeProvider>,
    )
    await clickRow('Group By')
    await clickRow('Status', 'last')
    expect(persistConfig).not.toHaveBeenCalled()
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
})

describe('resolveViewWrite — the one lock-write gate', () => {
  it('writes the whole view when unlocked', () => {
    expect(resolveViewWrite(false, view)).toEqual({ kind: 'config', view })
  })
  it('refuses a config write while locked', () => {
    expect(resolveViewWrite(true, view)).toEqual({ kind: 'refused' })
  })
  it('folds a state-only write while locked, dropping config keys like name', () => {
    const edited: SavedView = { ...view, name: 'Renamed', collapsed_groups: ['Done'] }
    const write = resolveViewWrite(true, edited, { viewState: true })
    expect(write.kind).toBe('state')
    if (write.kind === 'state') {
      expect('name' in write.state).toBe(false)
      expect(write.state.collapsed_groups).toEqual(['Done'])
    }
  })
})
