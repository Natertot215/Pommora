// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { CollectionNode } from '@pommora/core/Nexus/tree'
import type { SavedView } from '@pommora/core/Views/views'
import { firePointer, stubRect } from '@pommora/uix/Interactions/pointerHarness'
import { ID_KEY } from '@pommora/core/Nexus/identityMark'
import { useSession } from '../../Session/store'
import { installViewEnvironment, STATUS_DEF, renderView, settle } from '../../Testing/viewHarness'
import { propsAtRoot, valuesReply } from '../../Testing/pageValues'
import { stubDialer } from '../../vitest.setup'

installViewEnvironment()

const collection = (sets: unknown[], pages: unknown[], group: unknown): CollectionNode =>
  ({
    kind: 'collection',
    id: 'col1',
    title: 'Col',
    path: 'Col',
    sets,
    pages,
    properties: [STATUS_DEF],
    views: [
      {
        id: 'view_1',
        name: 'Cards',
        type: 'cards',
        property_order: ['_title', 'prop_status'],
        hidden_properties: [],
        group,
      },
    ],
  }) as unknown as CollectionNode

const page = (id: string, title: string, path: string): unknown => ({
  kind: 'page',
  id,
  title,
  path,
})
const set = (id: string, title: string, pages: unknown[]): unknown => ({
  kind: 'set',
  id,
  title,
  path: `Col/${title}`,
  pages,
  sets: [],
})

const STRUCTURAL = { kind: 'structural' }

// A loose page and one inside a Set: under structural grouping the two land in different bands.
const nested = (): CollectionNode =>
  collection(
    [set('sA', 'A', [page('p2', 'Two', 'Col/A/Two.md')])],
    [page('p1', 'One', 'Col/One.md')],
    STRUCTURAL,
  )

// Two Sets, each with one page, so a band drag has a neighbor to land beside.
const twoSets = (): CollectionNode =>
  collection(
    [
      set('sA', 'A', [page('p1', 'One', 'Col/A/One.md')]),
      set('sB', 'B', [page('p2', 'Two', 'Col/B/Two.md')]),
    ],
    [],
    STRUCTURAL,
  )

// Two option bands of one page each, so a cross-band drop can only rewrite the value.
const byStatus = (): CollectionNode =>
  collection([], [page('p1', 'One', 'Col/One.md'), page('p2', 'Two', 'Col/Two.md')], {
    kind: 'property',
    property_id: 'prop_status',
  })

const VALUES = valuesReply({
  p1: { [ID_KEY]: 'p1', ...propsAtRoot({ prop_status: 'active' }, [STATUS_DEF]) },
  p2: { [ID_KEY]: 'p2', ...propsAtRoot({ prop_status: 'complete' }, [STATUS_DEF]) },
})

let host: HTMLDivElement
let root: Root
let mutateSpy: ReturnType<typeof vi.fn>
let saveSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  mutateSpy = vi.fn(async () => true)
  saveSpy = vi.fn(async () => ({ ok: true, value: { id: 'view_1' } }))
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'view:loadValues': async () => VALUES,
    'views:save': saveSpy,
    menu: async () => ({ ok: true, value: null }),
  })
  useSession.setState({
    tree: { collections: [], contexts: [], personalization: {}, nexus: { id: 'nx' } } as never,
    selection: { kind: 'none' } as never,
    renamingPath: null,
    mutate: mutateSpy as never,
    select: vi.fn(async () => {}) as never,
  })
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const ROW = 100
const GRID = 200

// Each grid owns a 200px slice, its cards a 100px row apiece — enough for zoneAt and the row banding to resolve.
const layout = (): void => {
  const box = host.querySelector('.drop-line-host')
  if (box) stubRect(box, { top: 0, bottom: 800 })
  for (const [i, el] of [...host.querySelectorAll('.group-band-head')].entries())
    stubRect(el, { top: i * 24, bottom: i * 24 + 24 })
  for (const [gi, grid] of [...host.querySelectorAll('.cards-grid')].entries()) {
    const top = gi * GRID
    stubRect(grid, { top, bottom: top + GRID, left: 0, right: GRID })
    for (const [i, el] of [...grid.querySelectorAll('[data-rid]')].entries())
      stubRect(el, { top: top + i * ROW, bottom: top + i * ROW + ROW, left: 0, right: GRID })
  }
}

const mount = async (source: CollectionNode): Promise<void> => {
  await renderView(root, source)
  layout()
}

const dragTo = async (from: Element, y: number): Promise<void> => {
  const start = from.getBoundingClientRect()
  await act(async () => {
    firePointer(from, 'pointerdown', { x: 100, y: start.top + ROW / 2 })
  })
  await act(async () => {
    firePointer(window, 'pointermove', { x: 100, y })
  })
  await act(async () => {
    firePointer(window, 'pointerup')
  })
  await settle(400)
}

const card = (id: string): HTMLElement => host.querySelector(`[data-rid="${id}"]`) as HTMLElement
const gridOf = (id: string): Element => card(id).closest('.cards-grid') as Element
const lastSavedView = (): SavedView => saveSpy.mock.calls.at(-1)?.[2] as SavedView

describe('a card dropped across structural bands', () => {
  it('moves the page into the Set at the slot it landed on', async () => {
    await mount(nested())
    const dest = gridOf('p2').getBoundingClientRect()
    await dragTo(card('p1'), dest.top + 10)
    expect(mutateSpy).toHaveBeenCalledExactlyOnceWith({
      op: 'movePage',
      path: 'Col/One.md',
      newParentPath: 'Col/A',
      order: ['p1', 'p2'],
    })
  })
})

describe('a card dropped across property bands', () => {
  it('rewrites the grouped value and never touches the fs', async () => {
    await mount(byStatus())
    const dest = gridOf('p2').getBoundingClientRect()
    await dragTo(card('p1'), dest.top + 10)
    expect(mutateSpy).toHaveBeenCalledExactlyOnceWith({
      op: 'setProperty',
      path: 'Col/One.md',
      propertyId: 'prop_status',
      value: { kind: 'select', value: 'complete' },
    })
  })
})

describe('a band dragged over another', () => {
  it('persists group_order and never touches the fs', async () => {
    await mount(twoSets())
    const glyphs = host.querySelectorAll('.group-band-glyph')
    await act(async () => {
      firePointer(glyphs[1], 'pointerdown', { x: 10, y: 36 })
    })
    await act(async () => {
      firePointer(window, 'pointermove', { x: 10, y: 2 })
    })
    await act(async () => {
      firePointer(window, 'pointerup')
    })
    await settle(1)
    expect(lastSavedView().group_order).toEqual(['sB', 'sA'])
    expect(mutateSpy).not.toHaveBeenCalled()
  })
})
