// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { Root } from 'react-dom/client'
import type { CollectionNode } from '@pommora/core/Nexus/tree'
import { isWindowTarget, type SelectTarget, TAB_FAMILY } from '@pommora/core/Navigation/navRef'
import { SortableZone, useDragItem } from '@pommora/uix/Interactions/drag'
import { firePointer, stubRect } from '@pommora/uix/Testing/pointerHarness'
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
