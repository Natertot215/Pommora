// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import { useSession } from '../Session/store'
import { cachePageDetail } from '../Session/pageDetailCache'
import { PropertyPanel } from './PropertyPanel'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

const stageDef: PropertyDefinition = {
  id: 'prop_stage',
  name: 'Stage',
  type: 'select',
  select_options: [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
  ],
}
const noteDef: PropertyDefinition = { id: 'prop_note', name: 'Note', type: 'number' }

const PAGE = { id: 'p1', path: 'Col/Page.md' }
const detailWith = (frontmatter: Record<string, unknown>) => ({
  id: 'p1',
  title: 'Page',
  path: 'Col/Page.md',
  frontmatter,
  body: '',
})

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  useSession.setState({
    assetMap: {} as never,
    mutate: vi.fn(async () => true) as never,
    tree: {
      nexus: { id: 'nx' },
      personalization: { defaultIcons: {} },
      contexts: [
        {
          def: { id: 'ctx_areas', title: 'Areas', singular: 'Area' },
          spaces: [
            {
              kind: 'space',
              id: 'area_work',
              title: 'Work',
              path: '.nexus/contexts/Areas/Work',
              contextId: 'ctx_areas',
            },
          ],
        },
      ],
      collections: [
        {
          kind: 'collection',
          id: 'col1',
          title: 'Col',
          path: 'Col',
          sets: [],
          pages: [{ kind: 'page', id: 'p1', title: 'Page', path: 'Col/Page.md' }],
          properties: [stageDef, noteDef],
          views: [],
        },
      ],
    } as never,
  })
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const text = (): string => host.textContent ?? ''
const renderPanel = async (node: React.JSX.Element): Promise<void> => {
  await act(async () => {
    root.render(node)
  })
  await act(async () => {})
}

describe('PropertyPanel', () => {
  it('the page frame (onBack) seeds Context rows shown (B8)', async () => {
    await renderPanel(<PropertyPanel page={detailWith({})} panelStyle="filled" onBack={() => {}} />)
    expect(text()).toContain('Areas')
  })

  it('the inspector (no onBack) seeds Context rows hidden (B8)', async () => {
    cachePageDetail(detailWith({}))
    await renderPanel(<PropertyPanel page={PAGE} panelStyle="filled" />)
    // The Add affordance is present, but the un-valued Areas row is not seeded shown.
    expect(text()).toContain('Add Property')
    expect(text()).not.toContain('Areas')
  })

  it('a property with a value shows its row with no reveal write (the live predicate)', async () => {
    cachePageDetail(detailWith({ Stage: 'a' }))
    await renderPanel(<PropertyPanel page={PAGE} panelStyle="filled" />)
    expect(text()).toContain('Stage')
    // Note, with no value, stays hidden behind Add.
    expect(text()).not.toContain('Note')
  })
})
