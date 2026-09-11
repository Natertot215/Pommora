// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { CollectionNode } from '@pommora/core/Nexus/tree'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import type { SavedView } from '@pommora/core/Views/views'
import { useSession } from '../../Session/store'
import { ViewFrame } from './ViewFrame'
import { stubDialer } from '../../vitest.setup'
import { installViewEnvironment } from '../../Testing/viewHarness'
installViewEnvironment()

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

let host: HTMLDivElement
let root: Root
let mutate: ReturnType<typeof vi.fn>

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
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  mutate = vi.fn(async () => true)
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'views:save': vi.fn(async () => ({ ok: true, value: { id: 'view_a' } })),
  })
  useSession.setState({ load: vi.fn(async () => {}) as never, mutate: mutate as never })
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
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

  // The placeholder a viewless container shows carries the sentinel id, which has no place in a legible sidecar.
  it('the placeholder row on a container with no views issues no mutate', async () => {
    await mount(source(undefined))
    await clickRow('Table')
    expect(mutate).not.toHaveBeenCalled()
  })
})
