// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { Root } from 'react-dom/client'
import type { CollectionNode } from '../../Nexus/tree'
import type { PropertyDefinition } from '../../Properties/properties'
import type { SavedView } from '../views'
import { firePointer, stubRect } from '@pommora/uix/Utilities/pointerHarness'
import { useSession } from '../../Session/store'
import { mountEachTest } from '../../Testing/viewHarness'
import { VisibilityFrame } from './VisibilityFrame'

const save = vi.hoisted(() => vi.fn())
vi.mock('../viewWrite', () => ({ useSaveView: () => save }))

const schema: PropertyDefinition[] = [
  { id: 'prop_a', name: 'Alpha', type: 'number' },
  { id: 'prop_b', name: 'Beta', type: 'number' },
  { id: 'prop_c', name: 'Gamma', type: 'number' },
]
const view: SavedView = {
  id: 'view_a',
  name: 'Table',
  type: 'table',
  property_order: ['_title', 'prop_a', 'prop_b'],
  hidden_properties: ['prop_c'],
}
const source = { kind: 'collection', id: 'col1', path: 'Col', views: [view] } as never

let root: Root
mountEachTest((_h, r) => {
  root = r
})

const row = (name: string): Element =>
  [...document.querySelectorAll('[data-line-row]')].find((e) => e.textContent?.includes(name))!

const drag = async (name: string, from: number, ...to: number[]): Promise<void> => {
  save.mockClear()
  useSession.setState({
    tree: {
      contexts: [],
      collections: [],
      config: { personalization: { defaultIcons: {} } },
    } as never,
  })
  await act(async () => {
    root.render(
      <VisibilityFrame
        source={source as CollectionNode}
        schema={schema}
        view={view}
        onBack={() => {}}
      />,
    )
  })
  const zone = document.querySelector('.line-zone')!
  const [shown, hidden] = zone.children
  stubRect(zone, { top: 0, bottom: 100 })
  stubRect(shown, { top: 0, bottom: 60 })
  stubRect(hidden, { top: 60, bottom: 100 })
  stubRect(row('Title'), { top: 0, bottom: 20 })
  stubRect(row('Alpha'), { top: 20, bottom: 40 })
  stubRect(row('Beta'), { top: 40, bottom: 60 })
  stubRect(row('Gamma'), { top: 60, bottom: 80 })
  await act(async () => {
    firePointer(row(name), 'pointerdown', { x: 50, y: from })
    for (const y of to) firePointer(window, 'pointermove', { x: 50, y })
    firePointer(window, 'pointerup', { x: 50, y: to.at(-1) })
  })
}

describe('VisibilityFrame — the pane drag', () => {
  it('reorders a shown property at the slot', async () => {
    await drag('Beta', 50, 35, 22)
    expect(save).toHaveBeenCalledExactlyOnceWith(view, {
      property_order: ['_title', 'prop_b', 'prop_a'],
      hidden_properties: ['prop_c'],
    })
  })

  it('hides a shown property dropped in the hidden zone', async () => {
    await drag('Alpha', 30, 50, 90)
    expect(save).toHaveBeenCalledOnce()
    expect(save.mock.calls[0][1].hidden_properties).toContain('prop_a')
  })

  it('a release on its own slot writes nothing', async () => {
    await drag('Alpha', 30, 42, 30)
    expect(save).not.toHaveBeenCalled()
  })
})
