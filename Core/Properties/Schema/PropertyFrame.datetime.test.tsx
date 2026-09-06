// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { stubPointerCapture } from '@pommora/uix/Testing/pointerHarness'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import { useSession } from '../../Session/store'
import { PropertyFrame } from './PropertyFrame'
import { stubDialer } from '../../vitest.setup'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

stubPointerCapture()

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

const dateDef: PropertyDefinition = { id: 'prop_due', name: 'Due', type: 'datetime' }
const source = { id: 'col1', kind: 'collection', path: 'Col', title: 'Col', views: [] } as never

let host: HTMLDivElement
let root: Root
let saveSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  saveSpy = vi.fn(async () => ({ ok: true, value: { id: 'v1' } }))
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'schema:add': vi.fn(async () => ({ ok: true, value: { id: 'x' } })),
    'schema:rename': vi.fn(async () => ({ ok: true, value: null })),
    'schema:reorder': vi.fn(async () => ({ ok: true, value: null })),
    'schema:delete': vi.fn(async () => ({ ok: true, value: null })),
    'schema:assign': vi.fn(async () => ({ ok: true, value: null })),
    'property:delete': vi.fn(async () => ({ ok: true, value: null })),
    'views:save': saveSpy,
    'activeViews:set': vi.fn(async () => {}),
    'row-menu': vi.fn(async () => null),
    'error:show': vi.fn(async () => {}),
  })
  useSession.setState({
    load: vi.fn(async () => {}) as never,
    tree: { registry: [] } as never,
    renamingProperty: null,
    activeViews: {},
  })
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

/** Matches the role, not the tag: a menu row is a `role="button"` div. */
const buttonFor = (name: string): HTMLElement => {
  const el = [...document.querySelectorAll<HTMLElement>('button, [role="button"]')].find(
    (b) => b.getAttribute('aria-label') === name || b.textContent === name,
  )
  if (!el) throw new Error(`no button "${name}"`)
  return el
}

describe('the datetime Format editor writes the ACTIVE view (A-3)', () => {
  it('picking Short Date saves column_styles on the source node, not the schema', async () => {
    await act(async () => {
      root.render(
        <PropertyFrame collectionPath="Col" schema={[dateDef]} onBack={() => {}} source={source} />,
      )
    })
    const dueRow = [...host.querySelectorAll<HTMLElement>('span')].find(
      (el) => el.textContent === 'Due' && el.children.length === 0,
    )
    await act(async () => {
      dueRow!.click()
    })
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(() => r(undefined)))
    })
    await act(async () => {
      buttonFor('Date format').click()
    })
    await act(async () => {
      buttonFor('Short Date').click()
    })
    expect(saveSpy).toHaveBeenCalledWith(
      'Col',
      'collection',
      expect.objectContaining({ column_styles: { prop_due: { date_format: 'short' } } }),
    )
  })
})
