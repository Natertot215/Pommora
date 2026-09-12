// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { Root } from 'react-dom/client'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import type { CollectionNode } from '@pommora/core/Nexus/tree'
import type { SavedView } from '@pommora/core/Views/views'
import { firePointer, stubRect } from '@pommora/uix/Interactions/pointerHarness'
import { ID_KEY } from '@pommora/core/Nexus/identityMark'
import { useSession } from '../Session/store'
import { propsAtRoot, valuesReply } from '../Testing/pageValues'
import { stubDialer } from '../vitest.setup'
import { mountEachTest, renderView, settle } from '../Testing/viewHarness'

const statusDef: PropertyDefinition = {
  id: 'prop_status',
  name: 'Status',
  type: 'status',
  status_groups: [
    {
      id: 'in_progress',
      label: 'In Progress',
      color: 'blue',
      options: [{ value: 'active', label: 'Active', color: 'blue', group_id: 'in_progress' }],
    },
  ],
}

const page = (id: string, title: string): Record<string, unknown> => ({
  kind: 'page',
  id,
  title,
  path: `Col/${title}.md`,
})

const source = (view?: Partial<SavedView>): CollectionNode =>
  ({
    kind: 'collection',
    id: 'col1',
    title: 'Col',
    path: 'Col',
    sets: [],
    pages: [page('p1', 'One'), page('p2', 'Two')],
    properties: [statusDef],
    views: [
      {
        id: 'view_1',
        name: 'Table',
        type: 'table',
        property_order: ['_title', 'prop_status'],
        hidden_properties: [],
        group: { kind: 'structural' },
        ...view,
      },
    ],
  }) as unknown as CollectionNode

// A loose page and one inside a Set: under structural grouping the two land in different bands, so a drop across them relocates.
const banded = (view?: Partial<SavedView>): CollectionNode =>
  ({
    kind: 'collection',
    id: 'col1',
    title: 'Col',
    path: 'Col',
    sets: [
      {
        kind: 'set',
        id: 'sA',
        title: 'A',
        path: 'Col/A',
        pages: [{ kind: 'page', id: 'p2', title: 'Two', path: 'Col/A/Two.md' }],
        sets: [],
      },
    ],
    pages: [page('p1', 'One')],
    properties: [statusDef],
    views: [
      {
        id: 'view_1',
        name: 'Table',
        type: 'table',
        property_order: ['_title', 'prop_status'],
        hidden_properties: [],
        group: { kind: 'structural' },
        ...SORTED,
        ...view,
      },
    ],
  }) as unknown as CollectionNode

// Both rows share the sort value, so the manual order is the only thing separating them.
const VALUES = valuesReply({
  p1: { [ID_KEY]: 'p1', ...propsAtRoot({ prop_status: 'active' }, [statusDef]) },
  p2: { [ID_KEY]: 'p2', ...propsAtRoot({ prop_status: 'active' }, [statusDef]) },
})

const SORTED: Partial<SavedView> = {
  sort: [{ property_id: 'prop_status', direction: 'ascending' }],
}

let host: HTMLDivElement
let root: Root
mountEachTest((h, r) => {
  host = h
  root = r
})
let mutateSpy: ReturnType<typeof vi.fn>
let saveSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
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

const mountTable = async (view?: Partial<SavedView>): Promise<void> => {
  await renderView(root, source(view))
  const box = host.querySelector('.drop-line-host')
  if (box) stubRect(box, { top: 0, bottom: 48 })
  for (const [i, id] of ['p1', 'p2'].entries()) {
    const el = host.querySelector(`[data-rid="${id}"]`)
    if (el) stubRect(el, { top: i * 24, bottom: i * 24 + 24 })
  }
}

// Drag the second row up over the first and release.
const dragSecondRowUp = async (): Promise<void> => {
  const el = host.querySelector('[data-rid="p2"]') as HTMLElement
  await act(async () => {
    firePointer(el, 'pointerdown', { x: 4, y: 36 })
  })
  await act(async () => {
    firePointer(window, 'pointermove', { x: 4, y: 2 })
  })
  await act(async () => {
    firePointer(window, 'pointerup')
  })
  await settle()
}

const mountBanded = async (view?: Partial<SavedView>): Promise<void> => {
  await renderView(root, banded(view))
  const box = host.querySelector('.drop-line-host')
  if (box) stubRect(box, { top: 0, bottom: 96 })
  for (const [i, id] of ['p1', 'p2'].entries()) {
    const el = host.querySelector(`[data-rid="${id}"]`)
    if (el) stubRect(el, { top: i * 24, bottom: i * 24 + 24 })
  }
}

// Drag the loose row down into the Set's band and release.
const dragFirstRowDown = async (): Promise<void> => {
  const el = host.querySelector('[data-rid="p1"]') as HTMLElement
  await act(async () => {
    firePointer(el, 'pointerdown', { x: 4, y: 12 })
  })
  await act(async () => {
    firePointer(window, 'pointermove', { x: 4, y: 90 })
  })
  await act(async () => {
    firePointer(window, 'pointerup')
  })
  await settle()
}

const mountCards = async (view?: Partial<SavedView>): Promise<void> => {
  await renderView(root, source({ type: 'cards', ...view }))
  const zone = host.querySelector('.cards-grid')
  if (zone) stubRect(zone, { top: 0, bottom: 200, left: 0, right: 200 })
  for (const [i, id] of ['p1', 'p2'].entries()) {
    const el = host.querySelector(`[data-rid="${id}"]`)
    if (el) stubRect(el, { top: i * 100, bottom: i * 100 + 100, left: 0, right: 200 })
  }
}

// Drag the second card onto the first card's seat and release.
const dragSecondCardUp = async (): Promise<void> => {
  const el = host.querySelector('[data-rid="p2"]') as HTMLElement
  await act(async () => {
    firePointer(el, 'pointerdown', { x: 100, y: 150 })
  })
  await act(async () => {
    firePointer(window, 'pointermove', { x: 100, y: 20 })
  })
  await act(async () => {
    firePointer(window, 'pointerup')
  })
  await settle(400)
}

const lastSavedView = (): SavedView => saveSpy.mock.calls.at(-1)?.[2] as SavedView

describe('TableView row drop — where the manual order lands', () => {
  it('a reorder under a sort writes manual_order and never touches the fs', async () => {
    await mountTable(SORTED)
    await dragSecondRowUp()
    expect(lastSavedView().manual_order).toEqual(['p2', 'p1'])
    expect(mutateSpy).not.toHaveBeenCalled()
  })

  it('the same drop on a structural view writes page_order and no manual_order', async () => {
    await mountTable()
    await dragSecondRowUp()
    expect(mutateSpy).toHaveBeenCalledExactlyOnceWith({
      op: 'movePage',
      path: 'Col/Two.md',
      newParentPath: 'Col',
      order: ['p2', 'p1'],
    })
    expect(saveSpy).not.toHaveBeenCalled()
  })
})

describe('CardsView card drop — where the manual order lands', () => {
  it('a reorder under a sort writes manual_order and never touches the fs', async () => {
    await mountCards(SORTED)
    await dragSecondCardUp()
    expect(lastSavedView().manual_order).toEqual(['p2', 'p1'])
    expect(mutateSpy).not.toHaveBeenCalled()
  })

  it('the same drop on a structural view writes page_order and no manual_order', async () => {
    await mountCards()
    await dragSecondCardUp()
    expect(mutateSpy).toHaveBeenCalledExactlyOnceWith({
      op: 'movePage',
      path: 'Col/Two.md',
      newParentPath: 'Col',
      order: ['p2', 'p1'],
    })
    expect(saveSpy).not.toHaveBeenCalled()
  })
})

describe('TableView relocate — the condition that refuses to mint', () => {
  it('a stored manual_order is updated in place by the relocate', async () => {
    await mountBanded({ manual_order: ['p1', 'p2'] })
    await dragFirstRowDown()
    expect(lastSavedView().manual_order).toEqual(['p2', 'p1'])
    expect(mutateSpy).toHaveBeenCalledOnce()
  })

  it('a view holding none mints none — the page still moves', async () => {
    await mountBanded()
    await dragFirstRowDown()
    expect(saveSpy).not.toHaveBeenCalled()
    expect(mutateSpy).toHaveBeenCalledOnce()
  })
})
