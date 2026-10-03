// @vitest-environment jsdom
import { detail } from '../Testing/fixtures'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { PropertyDefinition } from './properties'
import { useSession } from '../Session/store'
import { cachePageDetail } from '../Session/pageDetailCache'
import { PropertyPanel } from './PropertyPanel'
import { valuesReply } from '../Testing/pageValues'
import { firePointer, stubPointerCapture, stubRect } from '@pommora/uix/Testing/pointerHarness'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub
stubPointerCapture()

const stageDef: PropertyDefinition = {
  id: 'prop_stage',
  name: 'Stage',
  type: 'select',
  select_options: [{ value: 'Alpha' }, { value: 'Beta' }],
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
    mutate: vi.fn(async () => ({})) as never,
    tree: {
      nexus: { id: 'nx' },
      config: {
        personalization: { defaultIcons: {} },
        registry: [stageDef, noteDef, rankDef],
        order: { contexts: contextOrder, spaces: {} },
        pageMetadata: {},
      },
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
    cachePageDetail(detail({ path: 'Col/Page.md', frontmatter: { Stage: 'Alpha' } }))
    await renderPanel(<PropertyPanel subject={PAGE} host="side-pane" />)
    expect(text()).toContain('Stage')
    expect(text()).not.toContain('Note')
  })

  it('a property held under another spelling shows its row', async () => {
    cachePageDetail(detail({ path: 'Col/Page.md', frontmatter: { stage: 'Alpha' } }))
    await renderPanel(<PropertyPanel subject={PAGE} host="side-pane" />)
    expect(text()).toContain('Stage')
  })

  it('a row removed through its menu disappears', async () => {
    ask = vi.fn(async () => ({ ok: true, value: 'value:remove' }))
    ;(window as unknown as { nexus: unknown }).nexus = {
      ask,
      tell: vi.fn(),
      on: vi.fn(() => () => {}),
    }
    cachePageDetail(detail({ path: 'Col/Page.md', frontmatter: { Stage: 'Alpha' } }))
    await renderPanel(<PropertyPanel subject={PAGE} host="dropdown" />)
    expect(text()).toContain('Stage')
    const cell = host.querySelector('[data-property-row="prop_stage"]')
    await act(async () => {
      cell?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    await act(async () => {})
    expect(text()).not.toContain('Stage')
  })

  it('a push naming the page or a property rename re-reads it, and a sibling’s push does not', async () => {
    useSession.setState({ valuesEpoch: null })
    cachePageDetail(detail({ path: 'Col/Page.md', frontmatter: { Stage: 'Alpha' } }))
    await renderPanel(<PropertyPanel subject={PAGE} host="side-pane" />)
    ask.mockImplementation(async () => valuesReply({ p1: { Stage: 'Beta' } as never }))
    const reads = (): unknown[] => ask.mock.calls.filter((c) => c[0] === 'view:loadValues')
    const push = (pageIds: string[]) =>
      useSession.getState().bumpContainerValues([{ rel: 'Col', pageIds }])
    await act(async () => push(['p9']))
    expect(reads()).toEqual([])
    await act(async () => push(['p1']))
    await act(async () => {})
    expect(text()).toContain('Beta')
    await act(async () => useSession.getState().bumpValuesEpoch('Stage', 'Stage'))
    expect(reads()).toEqual([
      ['view:loadValues', 'Col', ['p1']],
      ['view:loadValues', 'Col', ['p1']],
    ])
  })

  it('an edit made on one page doesn’t cover that page’s values after the panel moves away and back', async () => {
    ask = vi.fn(async () => ({ ok: true, value: 'value:remove' }))
    ;(window as unknown as { nexus: unknown }).nexus = {
      ask,
      tell: vi.fn(),
      on: vi.fn(() => () => {}),
    }
    cachePageDetail(detail({ path: 'Col/Page.md', frontmatter: { Stage: 'Alpha' } }))
    cachePageDetail(detail({ path: 'Col/Other.md', frontmatter: {} }))
    await renderPanel(<PropertyPanel subject={PAGE} host="dropdown" />)
    await act(async () => {
      host
        .querySelector('[data-property-row="prop_stage"]')
        ?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    await act(async () => {})
    expect(text()).not.toContain('Stage')
    await renderPanel(
      <PropertyPanel subject={{ kind: 'page', id: 'p2', path: 'Col/Other.md' }} host="dropdown" />,
    )
    await renderPanel(<PropertyPanel subject={PAGE} host="dropdown" />)
    expect(text()).toContain('Alpha')
  })

  it('a Space subject reads the registry and its node’s own values', async () => {
    setTree({ Stage: 'Alpha' })
    await renderPanel(<PropertyPanel subject={SPACE} host="dropdown" />)
    expect(text()).toContain('Stage')
    expect(text()).toContain('Alpha')
    expect(text()).not.toContain('Note')
    expect(ask.mock.calls.map((c) => c[0])).not.toContain('view:loadValues')
  })

  it('a Space keeps its edit until the push, then reads its node', async () => {
    ask = vi.fn(async () => ({ ok: true, value: 'value:remove' }))
    ;(window as unknown as { nexus: unknown }).nexus = {
      ask,
      tell: vi.fn(),
      on: vi.fn(() => () => {}),
    }
    setTree({ Stage: 'Alpha' })
    await renderPanel(<PropertyPanel subject={SPACE} host="dropdown" />)
    const cell = host.querySelector('[data-property-row="prop_stage"]')
    await act(async () => {
      cell?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    await act(async () => {})
    expect(text()).not.toContain('Alpha')
    await act(async () => setTree({ Stage: 'Beta' }))
    await act(async () => {})
    expect(text()).toContain('Beta')
  })

  it('a page’s Context rows read the nexus-wide order', async () => {
    setTree(undefined, ['ctx_topics', 'ctx_areas'])
    cachePageDetail(
      detail({
        path: 'Col/Page.md',
        frontmatter: { '<Areas>': ['Work'], '<Topics>': ['Craft'] },
      }),
    )
    await renderPanel(<PropertyPanel subject={PAGE} host="side-pane" />)
    expect(text()).toContain('Topics')
    expect(text().indexOf('Topics')).toBeLessThan(text().indexOf('Areas'))
  })

  it('a Space’s property rows read its own $order, unlisted last', async () => {
    setTree({ Stage: 'Alpha', Note: 5, Rank: 7, $order: { properties: ['Note', 'Stage'] } })
    await renderPanel(<PropertyPanel subject={SPACE} host="dropdown" />)
    const read = text()
    expect(read).toContain('Note')
    expect(read.indexOf('Note')).toBeLessThan(read.indexOf('Stage'))
    expect(read.indexOf('Stage')).toBeLessThan(read.indexOf('Rank'))
  })

  it('a Space’s $order lists a row under any spelling of its name', async () => {
    setTree({ Stage: 'Alpha', Rank: 7, $order: { properties: ['rank'] } })
    await renderPanel(<PropertyPanel subject={SPACE} host="dropdown" />)
    expect(text().indexOf('Rank')).toBeLessThan(text().indexOf('Stage'))
  })
})

describe('the property row drag', () => {
  const row = (id: string): Element =>
    host.querySelector(`[data-property-row="${id}"]`)!.closest('[data-line-row]')!
  const drag = async (id: string, from: number, ...to: number[]): Promise<void> => {
    cachePageDetail(detail({ path: 'Col/Page.md', frontmatter: { Stage: 'Alpha', Note: 3 } }))
    await renderPanel(<PropertyPanel subject={PAGE} host="side-pane" />)
    stubRect(row('prop_stage').closest('.line-zone')!, { top: 0, bottom: 40 })
    stubRect(row('prop_stage'), { top: 0, bottom: 20 })
    stubRect(row('prop_note'), { top: 20, bottom: 40 })
    await act(async () => {
      firePointer(row(id), 'pointerdown', { x: 50, y: from })
      for (const y of to) firePointer(window, 'pointermove', { x: 50, y })
      firePointer(window, 'pointerup', { x: 50, y: to.at(-1) })
    })
  }

  it('reorders the schema at the slot index among the shown rows', async () => {
    await drag('prop_note', 30, 15, 2)
    expect(ask).toHaveBeenCalledWith('schema:reorder', 'Col', 'prop_note', 0)
  })

  it('a release on its own slot writes nothing', async () => {
    await drag('prop_stage', 10, 25, 10)
    expect(ask).not.toHaveBeenCalledWith(
      'schema:reorder',
      expect.anything(),
      expect.anything(),
      expect.anything(),
    )
  })
})
