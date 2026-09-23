// @vitest-environment jsdom
import { detail } from '@pommora/core/Testing/fixtures'
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
const rankDef: PropertyDefinition = { id: 'prop_rank', name: 'Rank', type: 'number' }

const PAGE = { kind: 'page', id: 'p1', path: 'Col/Page.md' } as const
const SPACE = { kind: 'space', id: 'area_work' } as const

let host: HTMLDivElement
let root: Root
let ask: ReturnType<typeof vi.fn>

const spaceNode = (values?: Record<string, unknown>): unknown => ({
  kind: 'space',
  id: 'area_work',
  title: 'Work',
  path: '.nexus/contexts/Areas/Work',
  contextId: 'ctx_areas',
  values,
})

const setTree = (values?: Record<string, unknown>, contextOrder?: string[]): void => {
  useSession.setState({
    assetMap: {} as never,
    mutate: vi.fn(async () => true) as never,
    tree: {
      nexus: { id: 'nx' },
      personalization: { defaultIcons: {} },
      registry: [stageDef, noteDef, rankDef],
      contextOrder,
      contexts: [
        {
          def: { id: 'ctx_areas', title: 'Areas', singular: 'Area' },
          spaces: [spaceNode(values)],
        },
        {
          def: { id: 'ctx_topics', title: 'Topics', singular: 'Topic' },
          spaces: [
            {
              kind: 'space',
              id: 'topic_x',
              title: 'Craft',
              path: '.nexus/contexts/Topics/Craft',
              contextId: 'ctx_topics',
            },
          ],
        },
      ],
      pageMetadata: {},
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
}

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  ask = vi.fn(async () => ({ ok: true, value: null }))
  ;(window as unknown as { nexus: unknown }).nexus = {
    ask,
    tell: vi.fn(),
    on: vi.fn(() => () => {}),
  }
  setTree()
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
  it('an un-held Context row is hidden in the dropdown', async () => {
    cachePageDetail(detail({ path: 'Col/Page.md' }))
    await renderPanel(<PropertyPanel subject={PAGE} host="dropdown" />)
    expect(text()).not.toContain('Areas')
    expect(host.querySelector('[aria-label="Add Context"]')).not.toBeNull()
  })

  it('an un-held Context row is hidden in the side pane', async () => {
    cachePageDetail(detail({ path: 'Col/Page.md' }))
    await renderPanel(<PropertyPanel subject={PAGE} host="side-pane" />)
    expect(text()).not.toContain('Areas')
    expect(host.querySelector('[aria-label="Add Context"]')).not.toBeNull()
    expect(host.querySelector('[aria-label="Add Property"]')).not.toBeNull()
  })

  it('a held property shows its row and an unheld one stays hidden', async () => {
    cachePageDetail(detail({ path: 'Col/Page.md', frontmatter: { Stage: 'a' } }))
    await renderPanel(<PropertyPanel subject={PAGE} host="side-pane" />)
    expect(text()).toContain('Stage')
    expect(text()).not.toContain('Note')
  })

  it('a row removed through its menu disappears', async () => {
    ask = vi.fn(async () => ({ ok: true, value: 'value:remove' }))
    ;(window as unknown as { nexus: unknown }).nexus = {
      ask,
      tell: vi.fn(),
      on: vi.fn(() => () => {}),
    }
    cachePageDetail(detail({ path: 'Col/Page.md', frontmatter: { Stage: 'a' } }))
    await renderPanel(<PropertyPanel subject={PAGE} host="dropdown" />)
    expect(text()).toContain('Stage')
    const cell = host.querySelector('[data-property-row="prop_stage"]')
    await act(async () => {
      cell?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    await act(async () => {})
    expect(text()).not.toContain('Stage')
  })

  it('a Space subject reads the registry and its node’s own values', async () => {
    setTree({ Stage: 'a' })
    await renderPanel(<PropertyPanel subject={SPACE} host="dropdown" />)
    expect(text()).toContain('Stage')
    expect(text()).toContain('Alpha')
    expect(text()).not.toContain('Note')
    expect(ask.mock.calls.map((c) => c[0])).not.toContain('view:loadValues')
  })

  it('a Space keeps its edit until the confirming push, then reads its node', async () => {
    ask = vi.fn(async () => ({ ok: true, value: 'value:remove' }))
    ;(window as unknown as { nexus: unknown }).nexus = {
      ask,
      tell: vi.fn(),
      on: vi.fn(() => () => {}),
    }
    setTree({ Stage: 'a' })
    await renderPanel(<PropertyPanel subject={SPACE} host="dropdown" />)
    const cell = host.querySelector('[data-property-row="prop_stage"]')
    await act(async () => {
      cell?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    await act(async () => {})
    expect(text()).not.toContain('Alpha')
    await act(async () => setTree({ Stage: 'b' }))
    await act(async () => {})
    expect(text()).toContain('Beta')
  })

  it('a page’s Context rows read the nexus-wide order', async () => {
    setTree(undefined, ['ctx_topics', 'ctx_areas'])
    cachePageDetail(
      detail({
        path: 'Col/Page.md',
        frontmatter: { contextValues: { ctx_areas: ['area_work'], ctx_topics: ['topic_x'] } },
      }),
    )
    await renderPanel(<PropertyPanel subject={PAGE} host="side-pane" />)
    expect(text()).toContain('Topics')
    expect(text().indexOf('Topics')).toBeLessThan(text().indexOf('Areas'))
  })

  it('a Space’s property rows read its own $order, unlisted last', async () => {
    setTree({ Stage: 'a', Note: 5, Rank: 7, $order: { properties: ['Note', 'Stage'] } })
    await renderPanel(<PropertyPanel subject={SPACE} host="dropdown" />)
    const read = text()
    expect(read).toContain('Note')
    expect(read.indexOf('Note')).toBeLessThan(read.indexOf('Stage'))
    expect(read.indexOf('Stage')).toBeLessThan(read.indexOf('Rank'))
  })
})
