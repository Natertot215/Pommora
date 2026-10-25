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
import { firePointer, stubPointerCapture, stubRect } from '@pommora/uix/Utilities/pointerHarness'
import { REVEAL_DWELL_MS } from '@pommora/uix/Interactions/hoverReveal'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

stubPointerCapture()

const stageDef: PropertyDefinition = {
  id: 'prop_stage',
  label: 'Stage',
  key: 'Stage',
  type: 'select',
  select_options: [
    { id: 'opt_Alpha', key: 'Alpha', label: 'Alpha' },
    { id: 'opt_Beta', key: 'Beta', label: 'Beta' },
  ],
}
const noteDef: PropertyDefinition = { id: 'prop_note', label: 'Note', key: 'Note', type: 'number' }
const rankDef: PropertyDefinition = { id: 'prop_rank', label: 'Rank', key: 'Rank', type: 'number' }

const PAGE = { kind: 'page', id: 'p1', path: 'Col/Page.md' } as const
const SPACE = { kind: 'space', id: 'area_work' } as const

let host: HTMLDivElement
let root: Root
let ask: ReturnType<typeof vi.fn>

const spaceNode = (values?: Record<string, unknown>, rowOrder?: string[]): unknown => ({
  kind: 'space',
  id: 'area_work',
  title: 'Work',
  path: '.nexus/contexts/Areas/Work',
  contextId: 'ctx_areas',
  rowOrder,
  values,
})

const setTree = (
  values?: Record<string, unknown>,
  contextOrder?: string[],
  spaceOrder?: string[],
): void => {
  useSession.setState({
    assetMap: { files: {}, versions: {} },
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
          spaces: [spaceNode(values, spaceOrder)],
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
          propertyIds: [stageDef.id, noteDef.id],
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
/** Seeds `def` into the registry and assigns it to the page's Collection. */
const seedDef = (def: PropertyDefinition): void => {
  setTree()
  const tree = useSession.getState().tree as unknown as {
    config: { registry: PropertyDefinition[] }
    collections: { propertyIds: string[] }[]
  }
  tree.config.registry.push(def)
  tree.collections[0].propertyIds.push(def.id)
}
const menuAnswers = (action: string): void => {
  ask = vi.fn(async (channel: string) => ({ ok: true, value: channel === 'menu' ? action : null }))
  ;(window as unknown as { nexus: unknown }).nexus = {
    ask,
    tell: vi.fn(),
    on: vi.fn(() => () => {}),
  }
}
const popped = (n = 0): { label?: string; action?: string }[] =>
  (
    ask.mock.calls.filter((c) => c[0] === 'menu')[n]?.[1] as {
      items: { label?: string; action?: string }[]
    }
  ).items
const poppedLabels = (n = 0): string[] => popped(n).flatMap((i) => (i.label ? [i.label] : []))
const poppedActions = (n = 0): string[] => popped(n).flatMap((i) => (i.action ? [i.action] : []))
const rightClick = async (el: Element | null | undefined): Promise<void> => {
  await act(async () => {
    el?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
  })
  await act(async () => {})
}
/** Renders the Work Space, which links Personal on its own Areas Context. */
const renderSpace = async (): Promise<void> => {
  setTree()
  const tree = useSession.getState().tree as unknown as {
    contexts: { spaces: Record<string, unknown>[] }[]
  }
  const areas = tree.contexts[0].spaces
  areas[0].contextValues = { ctx_areas: ['area_life'] }
  areas.push({
    kind: 'space',
    id: 'area_life',
    title: 'Personal',
    path: '.nexus/contexts/Areas/Personal',
    contextId: 'ctx_areas',
  })
  await renderPanel(<PropertyPanel subject={SPACE} host="dropdown" />)
}
const pickerText = (): string =>
  [...document.querySelectorAll('[data-picker-portal]')].map((e) => e.textContent ?? '').join('')
const labelOf = (name: string): Element | undefined =>
  [...host.querySelectorAll('span')].find((e) => e.children.length === 0 && e.textContent === name)

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

  it('a page holding another casing of a property’s key shows no row for it', async () => {
    cachePageDetail(detail({ path: 'Col/Page.md', frontmatter: { stage: 'Alpha' } }))
    await renderPanel(<PropertyPanel subject={PAGE} host="side-pane" />)
    expect(text()).not.toContain('Stage')
  })

  it('a row removed through its menu disappears', async () => {
    ask = vi.fn(async () => ({ ok: true, value: 'cell:hide' }))
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

  it('Remove on a Link value’s menu clears the value and hides its row', async () => {
    const siteDef: PropertyDefinition = {
      id: 'prop_site',
      label: 'Site',
      key: 'Site',
      type: 'link',
    }
    seedDef(siteDef)
    menuAnswers('cell:hide')
    cachePageDetail(detail({ path: 'Col/Page.md', frontmatter: { Site: 'https://a.com' } }))
    await renderPanel(<PropertyPanel subject={PAGE} host="dropdown" />)
    expect(text()).toContain('Site')
    await act(async () => {
      host
        .querySelector('[data-property-row="prop_site"]')
        ?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    await act(async () => {})
    const menu = ask.mock.calls.find((c) => c[0] === 'menu')?.[1] as {
      items: { action?: string }[]
    }
    expect(menu.items.map((i) => i.action)).toContain('cell:hide')
    expect(useSession.getState().mutate).toHaveBeenCalledWith(
      expect.objectContaining({ propertyId: 'prop_site', value: null }),
    )
    expect(text()).not.toContain('Site')
  })

  it('a Link value naming no page pops the fallback menu, whose Edit Link opens the editor', async () => {
    const siteDef: PropertyDefinition = {
      id: 'prop_site',
      label: 'Site',
      key: 'Site',
      type: 'link',
    }
    seedDef(siteDef)
    menuAnswers('editLink')
    cachePageDetail(detail({ path: 'Col/Page.md', frontmatter: { Site: '[[Nope]]' } }))
    await renderPanel(<PropertyPanel subject={PAGE} host="dropdown" />)
    const row = host.querySelector('[data-property-row="prop_site"]')
    await act(async () => {
      row?.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    await act(async () => {})
    const menu = ask.mock.calls.find((c) => c[0] === 'menu')?.[1] as {
      items: { label?: string }[]
    }
    expect(menu.items.map((i) => i.label).filter(Boolean)).toEqual([
      'Edit Title',
      'Edit Link',
      'Clear',
      'Remove',
    ])
    expect(
      host.querySelector('[data-property-row="prop_site"] .value-field .cm-editor'),
    ).not.toBeNull()
  })

  it('a Link row’s label offers Edit Title and Edit Link before Clear and Remove, and its value offers the connection menu', async () => {
    seedDef({ id: 'prop_site', label: 'Site', key: 'Site', type: 'link' })
    menuAnswers('')
    cachePageDetail(detail({ path: 'Col/Page.md', frontmatter: { Site: 'https://a.com' } }))
    await renderPanel(<PropertyPanel subject={PAGE} host="dropdown" />)
    await rightClick(labelOf('Site'))
    expect(poppedLabels(0)).toEqual(['Edit Title', 'Edit Link', 'Clear', 'Remove'])
    await rightClick(host.querySelector('[data-property-row="prop_site"]'))
    expect(poppedActions(1)).toContain('title:copylink')
  })

  it('a File value’s menu offers Add File and Remove and never Clear, and its Remove takes the row away', async () => {
    seedDef({ id: 'prop_doc', label: 'Doc', key: 'Doc', type: 'file' })
    menuAnswers('cell:hide')
    cachePageDetail(detail({ path: 'Col/Page.md', frontmatter: { Doc: ['[[Spec.pdf]]'] } }))
    await renderPanel(<PropertyPanel subject={PAGE} host="dropdown" />)
    await rightClick(host.querySelector('[data-property-row="prop_doc"]'))
    expect(poppedLabels()).toEqual(['Add File', 'Remove'])
    expect(useSession.getState().mutate).toHaveBeenCalledWith(
      expect.objectContaining({ propertyId: 'prop_doc', value: null }),
    )
    expect(text()).not.toContain('Doc')
  })

  it('a File row’s label offers Add File and Remove', async () => {
    seedDef({ id: 'prop_doc', label: 'Doc', key: 'Doc', type: 'file' })
    menuAnswers('')
    cachePageDetail(detail({ path: 'Col/Page.md', frontmatter: { Doc: ['[[Spec.pdf]]'] } }))
    await renderPanel(<PropertyPanel subject={PAGE} host="dropdown" />)
    await rightClick(labelOf('Doc'))
    expect(poppedLabels()).toEqual(['Add File', 'Remove'])
  })

  it('a Context row’s click opens its Spaces, leaving the Space itself out', async () => {
    await renderSpace()
    await act(async () => {
      ;(host.querySelector('[data-property-row="ctx_areas"]') as HTMLElement).click()
    })
    expect(pickerText()).toContain('Personal')
    expect(pickerText()).not.toContain('Work')
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
    await act(async () => useSession.getState().bumpValuesEpoch())
    expect(reads()).toEqual([
      ['view:loadValues', 'Col', ['p1']],
      ['view:loadValues', 'Col', ['p1']],
    ])
  })

  it('an edit made on one page doesn’t cover that page’s values after the panel moves away and back', async () => {
    ask = vi.fn(async () => ({ ok: true, value: 'cell:hide' }))
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

  it('a page shows its Aliases row after the Properties group, and a Space shows none', async () => {
    const aliasesLabel = (): Element | undefined =>
      Array.from(host.querySelectorAll('*')).find(
        (el) => el.children.length === 0 && el.textContent === 'Aliases',
      )
    cachePageDetail(detail({ path: 'Col/Page.md', frontmatter: { Stage: 'Alpha' } }))
    for (const panelHost of ['dropdown', 'side-pane'] as const) {
      await renderPanel(<PropertyPanel key={panelHost} subject={PAGE} host={panelHost} />)
      const lastGroup = Array.from(host.querySelectorAll('[data-reveal-host]')).find(
        (g) => g.firstElementChild?.textContent === 'Properties',
      ) as Element
      expect(lastGroup.textContent).toContain('Stage')
      const label = aliasesLabel()
      expect(label).toBeDefined()
      expect(
        lastGroup.compareDocumentPosition(label as Element) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
      expect(lastGroup.contains(label as Element)).toBe(false)
    }
    setTree({ Stage: 'Alpha' })
    await renderPanel(<PropertyPanel subject={SPACE} host="dropdown" />)
    expect(text()).toContain('Stage')
    expect(aliasesLabel()).toBeUndefined()
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
    ask = vi.fn(async () => ({ ok: true, value: 'cell:hide' }))
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
    setTree({ Stage: 'Alpha', Note: 5, Rank: 7 }, undefined, ['prop_note', 'prop_stage'])
    await renderPanel(<PropertyPanel subject={SPACE} host="dropdown" />)
    const read = text()
    expect(read).toContain('Note')
    expect(read.indexOf('Note')).toBeLessThan(read.indexOf('Stage'))
    expect(read.indexOf('Stage')).toBeLessThan(read.indexOf('Rank'))
  })
})

describe('the Add row', () => {
  afterEach(() => vi.useRealTimers())

  const addRow = (label: string): HTMLElement | null =>
    [...host.querySelectorAll<HTMLElement>('[data-ghost-root]')].find(
      (el) => el.textContent === label,
    ) ?? null
  const press = async (el: Element | null): Promise<void> => {
    await act(async () => {
      el?.querySelector<HTMLElement>('[role="button"]')?.click()
    })
  }
  const dismiss = async (): Promise<void> => {
    await act(async () => {
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    await act(async () => {
      vi.advanceTimersByTime(1000)
    })
  }

  it('a standing Add row holds while the chooser it opened is open', async () => {
    vi.useFakeTimers()
    cachePageDetail(detail({ path: 'Col/Page.md' }))
    await renderPanel(<PropertyPanel subject={PAGE} host="dropdown" />)
    await press(addRow('Add Property'))
    expect(addRow('Add Property')?.hasAttribute('data-reveal-held')).toBe(true)
    expect(document.body.textContent).toContain('Note')
    await dismiss()
    expect(addRow('Add Property')?.hasAttribute('data-reveal-held')).toBe(false)
  })

  it('a hovered Add row stays held through its chooser, then leaves', async () => {
    vi.useFakeTimers()
    cachePageDetail(detail({ path: 'Col/Page.md', frontmatter: { Stage: 'Alpha' } }))
    await renderPanel(<PropertyPanel subject={PAGE} host="dropdown" />)
    const group = host.querySelector('[aria-label="Add Property"]')?.closest('[data-reveal-host]')
    await act(async () => {
      group?.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }))
      firePointer(window, 'pointermove')
    })
    await act(async () => {
      vi.advanceTimersByTime(REVEAL_DWELL_MS)
    })
    await press(addRow('Add Property'))
    expect(addRow('Add Property')?.hasAttribute('data-reveal-held')).toBe(true)
    await dismiss()
    expect(addRow('Add Property')).toBeNull()
  })
})

describe('the property row drag', () => {
  const row = (id: string): Element =>
    host.querySelector(`[data-property-row="${id}"]`)!.closest('[data-line-row]')!
  const drag = async (id: string, from: number, ...to: number[]): Promise<void> => {
    cachePageDetail(detail({ path: 'Col/Page.md', frontmatter: { Stage: 'Alpha', Note: 3 } }))
    await renderPanel(<PropertyPanel subject={PAGE} host="side-pane" />)
    await pull(id, from, ...to)
  }
  const pull = async (id: string, from: number, ...to: number[]): Promise<void> => {
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
    expect(useSession.getState().mutate).toHaveBeenCalledWith({
      op: 'reorderAssigned',
      containerPath: 'Col',
      propertyId: 'prop_note',
      toIndex: 0,
    })
  })

  it('a release on its own slot writes nothing', async () => {
    await drag('prop_stage', 10, 25, 10)
    expect(useSession.getState().mutate).not.toHaveBeenCalled()
  })

  it('a Space reorder writes its shown rows by id', async () => {
    setTree({ Stage: 'Alpha', Note: 3 })
    await renderPanel(<PropertyPanel subject={SPACE} host="side-pane" />)
    await pull('prop_note', 30, 15, 2)
    expect(useSession.getState().mutate).toHaveBeenCalledWith({
      op: 'setSpaceRowOrder',
      path: '.nexus/contexts/Areas/Work',
      ids: ['prop_note', 'prop_stage'],
    })
  })
})
