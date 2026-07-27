// @vitest-environment jsdom
// The locked scope's contract: a frozen view config never takes a write it can't land — the seam
// answers a refusal envelope, the payload writer is never reached, and the panes that write it
// aren't reachable to author into.
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { CollectionNode } from '@shared/types'
import type { PropertyDefinition } from '@shared/properties'
import type { SavedView } from '@shared/views'
import { useSession } from '@renderer/store'
import { GroupingPane } from '@renderer/Components/Detail/GroupingPane'
import { SettingsPane } from '@renderer/Components/Detail/SettingsPane'
import {
  useSaveView,
  VIEW_CONFIG_LOCKED,
  ViewEmbedScopeProvider,
  type ViewEmbedScopeValue,
} from './ViewEmbedScope'
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
let sourceSave: Mock

const scope = (locked: boolean): ViewEmbedScopeValue => ({
  source,
  view,
  persistConfig,
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
  sourceSave = vi.fn(async () => ({ ok: true }))
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
  const save = useSaveView(source, async () => {})
  useEffect(() => {
    void save({ ...view, name: 'Renamed' }).then(onResult)
  }, [save, onResult])
  return null
}

describe('a locked view-embed scope', () => {
  it('answers the write with a refusal instead of a fake success', async () => {
    const results: unknown[] = []
    await render(
      <ViewEmbedScopeProvider value={scope(true)}>
        <Probe onResult={(r) => results.push(r)} />
      </ViewEmbedScopeProvider>,
    )
    expect(results).toEqual([{ ok: false, error: VIEW_CONFIG_LOCKED }])
    expect(persistConfig).not.toHaveBeenCalled()
  })

  it('persists through the payload writer when unlocked', async () => {
    const results: unknown[] = []
    await render(
      <ViewEmbedScopeProvider value={scope(false)}>
        <Probe onResult={(r) => results.push(r)} />
      </ViewEmbedScopeProvider>,
    )
    expect(results).toEqual([{ ok: true, id: view.id }])
    expect(persistConfig).toHaveBeenCalledWith({ ...view, name: 'Renamed' })
  })

  it('drops nothing to the source container either', async () => {
    await render(
      <ViewEmbedScopeProvider value={scope(true)}>
        <GroupingPane
          source={source}
          view={view}
          schema={[statusDef]}
          label="Settings"
          subGrouping
          onBack={() => {}}
        />
      </ViewEmbedScopeProvider>,
    )
    await clickRow('Group By')
    await clickRow('Status', 'last')
    expect(persistConfig).not.toHaveBeenCalled()
    expect(sourceSave).not.toHaveBeenCalled()
  })

  it('closes the config leaves in the settings pane, so there is nothing to author into', async () => {
    await render(
      <ViewEmbedScopeProvider value={scope(true)}>
        <SettingsPane />
      </ViewEmbedScopeProvider>,
    )
    await clickRow('Group')
    expect(texts()).not.toContain('Group By')
  })

  it('opens them when unlocked', async () => {
    await render(
      <ViewEmbedScopeProvider value={scope(false)}>
        <SettingsPane />
      </ViewEmbedScopeProvider>,
    )
    await clickRow('Group')
    expect(texts()).toContain('Group By')
  })
})
