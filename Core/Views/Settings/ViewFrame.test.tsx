// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { Root } from 'react-dom/client'
import type { CollectionNode } from '@pommora/core/Nexus/tree'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import type { SavedView } from '@pommora/core/Views/views'
import { useSession } from '../../Session/store'
import { ViewFrame } from './ViewFrame'
import { stubDialer } from '../../vitest.setup'
import { mountEachTest } from '../../Testing/viewHarness'
import { firePointer, stubRect } from '@pommora/uix/Testing/pointerHarness'

const schema: PropertyDefinition[] = [{ id: 'prop_status', name: 'Status', type: 'status' }]

const view = (id: string, name: string): SavedView => ({
  id,
  name,
  type: 'table',
  property_order: ['_title'],
  hidden_properties: [],
})

const source = (views?: SavedView[]): CollectionNode =>
  ({
    kind: 'collection',
    id: 'col1',
    title: 'Col',
    path: 'Col',
    sets: [],
    pages: [],
    properties: schema,
    views,
  }) as unknown as CollectionNode

let root: Root
mountEachTest((_h, r) => {
  root = r
})
let mutate: ReturnType<typeof vi.fn>
let reorder: ReturnType<typeof vi.fn>

const mount = async (node: CollectionNode): Promise<void> => {
  await act(async () => {
    root.render(<ViewFrame node={node} schema={schema} onClose={() => {}} />)
  })
}
const clickRow = async (name: string): Promise<void> => {
  const row = [...document.querySelectorAll('button, [role="button"]')].find(
    (e) => e.textContent?.includes(name) && !e.getAttribute('aria-label'),
  )
  await act(async () => {
    ;(row as HTMLElement).click()
  })
}

beforeEach(() => {
  mutate = vi.fn(async () => ({}))
  reorder = vi.fn(async () => ({ ok: true, value: null }))
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'views:reorder': reorder,
    'views:save': vi.fn(async () => ({ ok: true, value: { id: 'view_a' } })),
  })
  useSession.setState({ load: vi.fn(async () => {}) as never, mutate: mutate as never })
})

describe('ViewFrame — switching the active view', () => {
  it('a saved row writes active_view through the mutate rail', async () => {
    await mount(source([view('view_a', 'Table'), view('view_b', 'Board')]))
    await clickRow('Board')
    expect(mutate).toHaveBeenCalledWith({
      op: 'setActiveView',
      path: 'Col',
      kind: 'collection',
      viewId: 'view_b',
    })
  })

  it('re-selecting the active row issues no mutate', async () => {
    await mount(source([view('view_a', 'Table'), view('view_b', 'Board')]))
    await clickRow('Table')
    expect(mutate).not.toHaveBeenCalled()
  })

  // The placeholder a viewless container shows carries the sentinel id, which has no place in a legible sidecar.
  it('the placeholder row on a container with no views issues no mutate', async () => {
    await mount(source(undefined))
    await clickRow('Table')
    expect(mutate).not.toHaveBeenCalled()
  })
})

describe('ViewFrame — reordering views', () => {
  const row = (name: string): Element =>
    [...document.querySelectorAll('[data-line-row]')].find((e) => e.textContent?.includes(name))!
  const drag = async (
    views: SavedView[],
    name: string,
    from: number,
    ...to: number[]
  ): Promise<boolean> => {
    await mount(source(views))
    stubRect(document.querySelector('.line-zone')!, { top: 0, bottom: 60 })
    for (const [i, v] of views.entries())
      stubRect(row(v.name), { top: i * 20, bottom: i * 20 + 20 })
    await act(async () => {
      firePointer(row(name), 'pointerdown', { x: 50, y: from })
      for (const y of to) firePointer(window, 'pointermove', { x: 50, y })
    })
    const lifted = document.querySelector('.drag-ghost') !== null
    await act(async () => {
      firePointer(window, 'pointerup', { x: 50, y: to.at(-1) })
    })
    return lifted
  }

  it('writes the order with the view moved before the slot', async () => {
    await drag([view('view_a', 'Table'), view('view_b', 'Board')], 'Board', 30, 15, 2)
    expect(reorder).toHaveBeenCalledWith('Col', 'collection', ['view_b', 'view_a'])
  })

  it('a single view is locked: it never lifts and writes nothing', async () => {
    expect(await drag([view('view_a', 'Table')], 'Table', 10, 30, 50)).toBe(false)
    expect(reorder).not.toHaveBeenCalled()
  })
})
