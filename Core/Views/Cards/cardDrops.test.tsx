// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { Root } from 'react-dom/client'
import type { CollectionNode } from '@pommora/core/Nexus/tree'
import { firePointer, stubRect } from '@pommora/uix/Interactions/pointerHarness'
import { ID_KEY } from '@pommora/core/Nexus/identityMark'
import { useSession } from '../../Session/store'
import { mountEachTest, STATUS_DEF, renderView, settle } from '../../Testing/viewHarness'
import { propsAtRoot, valuesReply } from '../../Testing/pageValues'
import { stubDialer } from '../../vitest.setup'

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
mountEachTest((h, r) => {
  host = h
  root = r
})
let mutateSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  mutateSpy = vi.fn(async () => true)
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'view:loadValues': async () => VALUES,
    'views:save': async () => ({ ok: true, value: { id: 'view_1' } }),
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
