// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { Root } from 'react-dom/client'
import type { CollectionNode } from '@pommora/core/Nexus/tree'
import { isWindowTarget, type SelectTarget, TAB_FAMILY } from '@pommora/core/Navigation/navRef'
import { SortableZone, useDragItem } from '@pommora/uix/Interactions/drag'
import { firePointer, stubRect } from '@pommora/uix/Testing/pointerHarness'
import { stack } from '@pommora/uix/Theme/stack'
import { ID_KEY } from '@pommora/core/Nexus/identityMark'
import { useSession } from '../../Session/store'
import { mountEachTest, STATUS_DEF, renderView, settle } from '../../Testing/viewHarness'
import { propsAtRoot, valuesReply } from '../../Testing/pageValues'
import { stubDialer } from '../../vitest.setup'
import { makeTree } from '../../Testing/testTree'

const collection = (
  sets: unknown[],
  pages: unknown[],
  group: unknown,
  sort?: unknown,
): CollectionNode =>
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
        sort,
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
  p1: { [ID_KEY]: 'p1', ...propsAtRoot({ prop_status: 'Active' }, [STATUS_DEF]) },
  p2: { [ID_KEY]: 'p2', ...propsAtRoot({ prop_status: 'Complete' }, [STATUS_DEF]) },
})

let host: HTMLDivElement
let root: Root
mountEachTest((h, r) => {
  host = h
  root = r
})
let mutateSpy: ReturnType<typeof vi.fn>
let saveSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  mutateSpy = vi.fn(async () => ({}))
  saveSpy = vi.fn(async () => ({ ok: true, value: { id: 'view_1' } }))
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'view:loadValues': async () => VALUES,
    'views:save': saveSpy,
    menu: async () => ({ ok: true, value: null }),
  })
  useSession.setState({
    tree: makeTree(),
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
  it('under Custom, moves the page into the Set without writing the folder order', async () => {
    await mount(nested())
    const dest = gridOf('p2').getBoundingClientRect()
    await dragTo(card('p1'), dest.top + 10)
    expect(mutateSpy).toHaveBeenCalledExactlyOnceWith({
      op: 'movePage',
      path: 'Col/One.md',
      newParentPath: 'Col/A',
    })
  })
})

describe('a card dropped across Set bands lands where its slot drew', () => {
  const lastSaved = (): { manual_order?: string[] } => saveSpy.mock.calls.at(-1)?.[2] ?? {}
  const deep = (order: 'custom' | 'location'): CollectionNode => {
    const src = collection(
      [
        {
          ...(set('sA', 'A', [page('a1', 'A One', 'Col/A/A One.md')]) as object),
          sets: [
            {
              kind: 'set',
              id: 'sA1',
              title: 'A1',
              path: 'Col/A/A1',
              pages: [
                page('s1', 'S One', 'Col/A/A1/S One.md'),
                page('s2', 'S Two', 'Col/A/A1/S Two.md'),
              ],
              sets: [],
            },
          ],
        },
      ],
      [page('r1', 'Root', 'Col/Root.md')],
      STRUCTURAL,
    )
    const [v] = src.views ?? []
    return { ...src, views: [{ ...v, structural_order_mode: order }] } as CollectionNode
  }
  const seat = (): void => {
    const [bandA, tail] = [...host.querySelectorAll('.cards-grid')]
    stubRect(bandA, { top: 0, bottom: 300, left: 0, right: GRID })
    for (const [i, id] of ['a1', 's1', 's2'].entries())
      stubRect(card(id), { top: i * ROW, bottom: i * ROW + ROW, left: 0, right: GRID })
    stubRect(tail, { top: 400, bottom: 500, left: 0, right: GRID })
    stubRect(card('r1'), { top: 400, bottom: 500, left: 0, right: GRID })
  }

  it('under Custom, a slot between the Sub-Set’s pages writes the view order at that slot and appends to the folder', async () => {
    await renderView(root, deep('custom'))
    seat()
    await dragTo(card('r1'), 240)
    const order = lastSaved().manual_order ?? []
    expect(order.indexOf('r1')).toBe(order.indexOf('s2') - 1)
    expect(order.indexOf('r1')).toBeGreaterThan(order.indexOf('s1'))
    expect(mutateSpy).toHaveBeenCalledExactlyOnceWith({
      op: 'movePage',
      path: 'Col/Root.md',
      newParentPath: 'Col/A',
    })
  })

  it('a refused move leaves the view order as it was and says the card returned', async () => {
    mutateSpy.mockImplementation(async () => null)
    await renderView(root, deep('custom'))
    seat()
    await dragTo(card('r1'), 240)
    await settle()
    expect(saveSpy).not.toHaveBeenCalled()
    expect(document.querySelector('[aria-live="assertive"]')?.textContent).toBe(
      'Root returned to its place.',
    )
  })

  it('under Location, a slot past the Set’s own pages resolves nothing, so nothing is written', async () => {
    await renderView(root, deep('location'))
    seat()
    await dragTo(card('r1'), 240)
    expect(mutateSpy).not.toHaveBeenCalled()
    expect(saveSpy).not.toHaveBeenCalled()
  })
})

describe('a Set card whose view write is refused', () => {
  it('says the Set returned to its place', async () => {
    saveSpy.mockImplementation(async () => ({ ok: false, error: { message: 'no' } }))
    await mount(
      collection([set('sA', 'A', []), set('sB', 'B', [])], [page('p1', 'One', 'Col/One.md')], {
        kind: 'property',
        property_id: 'prop_status',
      }),
    )
    const [a, b] = host.querySelectorAll<HTMLElement>(
      '.set-cards-row [aria-roledescription="sortable"]',
    )
    stubRect(a, { top: -300, bottom: -200, left: 0, right: 200 })
    stubRect(b, { top: -300, bottom: -200, left: 220, right: 420 })
    await act(async () => {
      firePointer(b, 'pointerdown', { x: 320, y: -250 })
    })
    await act(async () => {
      firePointer(window, 'pointermove', { x: 40, y: -250 })
    })
    await act(async () => {
      firePointer(window, 'pointerup')
    })
    await settle(400)
    expect(saveSpy).toHaveBeenCalled()
    expect(document.querySelector('[aria-live="assertive"]')?.textContent).toBe(
      'B returned to its place.',
    )
  })
})

describe('a card dropped across property bands', () => {
  it('writes the view order at the slot along with the value', async () => {
    await mount(byStatus())
    const dest = gridOf('p2').getBoundingClientRect()
    await dragTo(card('p1'), dest.top + ROW + 50)
    expect(saveSpy.mock.calls.at(-1)?.[2]?.manual_order).toEqual(['p2', 'p1'])
  })

  it('rewrites the grouped value and never touches the fs', async () => {
    await mount(byStatus())
    const dest = gridOf('p2').getBoundingClientRect()
    await dragTo(card('p1'), dest.top + 10)
    expect(mutateSpy).toHaveBeenCalledExactlyOnceWith({
      op: 'setProperty',
      path: 'Col/One.md',
      propertyId: 'prop_status',
      value: { kind: 'select', value: 'Complete' },
    })
  })
})

const TWO_KEYS = [
  { property_id: '_title', direction: 'asc' },
  { property_id: 'prop_status', direction: 'asc' },
]

function SinkTab(): React.JSX.Element {
  const { setNodeRef, style, handle } = useDragItem('tab')
  return <div ref={setNodeRef} data-sink-tab style={style} {...handle} />
}

function Sink({
  className,
  receive,
  windowRow = false,
}: {
  className: string
  receive: (item: SelectTarget) => void
  windowRow?: boolean
}): React.JSX.Element {
  return (
    <SortableZone<SelectTarget>
      className={className}
      items={['tab']}
      label={() => 'tab'}
      family={TAB_FAMILY}
      accepts={windowRow ? isWindowTarget : undefined}
      receive={(item) => receive(item)}
    >
      <SinkTab />
    </SortableZone>
  )
}

describe('a card carried to a tab row', () => {
  let received: ReturnType<typeof vi.fn<(item: SelectTarget) => void>>
  const sinks = (): React.ReactNode => (
    <>
      <Sink className="sink-main" receive={received} />
      <Sink className="sink-window" receive={received} windowRow />
    </>
  )
  const seat = (): void => {
    for (const [i, name] of ['.sink-main', '.sink-window'].entries()) {
      const top = 900 + i * 200
      stubRect(host.querySelector(name) as Element, { top, bottom: top + 100, left: 0, right: 400 })
      stubRect(host.querySelectorAll('[data-sink-tab]')[i], {
        top,
        bottom: top + 100,
        left: 0,
        right: 100,
      })
    }
  }
  const mountBeside = async (source: CollectionNode): Promise<void> => {
    await renderView(root, source, sinks())
    layout()
    seat()
  }
  const carryTo = async (from: Element, x: number, y: number): Promise<void> => {
    const start = from.getBoundingClientRect()
    await act(async () => {
      firePointer(from, 'pointerdown', { x: 100, y: start.top + ROW / 2 })
    })
    await act(async () => {
      firePointer(window, 'pointermove', { x, y })
    })
    await act(async () => {
      firePointer(window, 'pointerup', { x, y })
    })
    await settle(400)
  }

  beforeEach(() => {
    received = vi.fn()
  })

  it('carries a page card to a tab row with its page target and writes nothing in the view', async () => {
    await mountBeside(byStatus())
    await carryTo(card('p1'), 200, 950)
    expect(received).toHaveBeenCalledExactlyOnceWith({
      kind: 'page',
      id: 'p1',
      path: 'Col/One.md',
    })
    expect(mutateSpy).not.toHaveBeenCalled()
    expect(saveSpy).not.toHaveBeenCalled()
  })

  it('returns a card released over nothing and writes nothing', async () => {
    await mountBeside(byStatus())
    await carryTo(card('p1'), 700, 3000)
    expect(received).not.toHaveBeenCalled()
    expect(mutateSpy).not.toHaveBeenCalled()
    expect(saveSpy).not.toHaveBeenCalled()
  })

  it('carries a Set card to the main row and never to a row that accepts only window targets', async () => {
    await mountBeside(nested())
    const setCard = host.querySelector(
      '.set-cards-row [aria-roledescription="sortable"]',
    ) as Element
    stubRect(setCard, { top: -300, bottom: -200, left: 0, right: 200 })
    await carryTo(setCard, 200, 1150)
    expect(received).not.toHaveBeenCalled()
    await carryTo(setCard, 200, 950)
    expect(received).toHaveBeenCalledExactlyOnceWith({ kind: 'set', id: 'sA', path: 'Col/A' })
  })

  it('carries a Set card on the drag overlay, above every window, with its own card hidden', async () => {
    await mountBeside(nested())
    const setCard = host.querySelector(
      '.set-cards-row [aria-roledescription="sortable"]',
    ) as HTMLElement
    stubRect(setCard, { top: -300, bottom: -200, left: 0, right: 200 })
    await act(async () => {
      firePointer(setCard, 'pointerdown', { x: 100, y: -250 })
    })
    await act(async () => {
      firePointer(window, 'pointermove', { x: 200, y: 950 })
    })
    const chrome = document.querySelector('.card-overlay')?.closest<HTMLElement>('body > div')
    expect(chrome?.style.zIndex).toBe(String(stack.top.dragOverlay))
    expect(chrome?.querySelector<HTMLElement>('.cards-view')?.style.padding).toBe('0px')
    expect(stack.top.dragOverlay).toBeGreaterThan(stack.top.floating)
    expect(setCard.style.visibility).toBe('hidden')
    await act(async () => {
      firePointer(window, 'pointerup', { x: 200, y: 3000 })
    })
    await settle(400)
  })

  it('keeps a card home in a view that cannot reorder and still carries it to a tab row', async () => {
    await mountBeside(collection([], [page('p1', 'One', 'Col/One.md')], undefined, TWO_KEYS))
    await carryTo(card('p1'), 200, 950)
    expect(received).toHaveBeenCalledExactlyOnceWith({
      kind: 'page',
      id: 'p1',
      path: 'Col/One.md',
    })
    expect(mutateSpy).not.toHaveBeenCalled()
  })
})
