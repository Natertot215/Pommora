// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { Root } from 'react-dom/client'
import type { PropertyDefinition } from '../../Properties/properties'
import type { SavedView } from '../views'
import { firePointer, stubRect } from '@pommora/uix/Utilities/pointerHarness'
import { useSession } from '../../Session/store'
import { mountEachTest } from '../../Testing/viewHarness'
import { revealDim } from '@pommora/uix/Interactions/hover-reveal.css'
import { VisibilityFrame } from './VisibilityFrame'

const save = vi.fn()

const schema: PropertyDefinition[] = [
  { id: 'prop_a', label: 'Alpha', key: 'Alpha', type: 'number' },
  { id: 'prop_b', label: 'Beta', key: 'Beta', type: 'number' },
  { id: 'prop_c', label: 'Gamma', key: 'Gamma', type: 'number' },
]
const view: SavedView = {
  id: 'view_a',
  name: 'Table',
  type: 'table',
  property_order: ['_title', 'prop_a', 'prop_b'],
  hidden_properties: ['prop_c'],
}

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
        schema={schema}
        view={view}
        back={{ label: 'Settings', onBack: () => {} }}
        save={save}
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
    expect(save).toHaveBeenCalledExactlyOnceWith({
      property_order: ['_title', 'prop_b', 'prop_a'],
      hidden_properties: ['prop_c'],
    })
  })

  it('hides a shown property dropped in the hidden zone', async () => {
    await drag('Alpha', 30, 50, 90)
    expect(save).toHaveBeenCalledOnce()
    expect(save.mock.calls[0][0].hidden_properties).toContain('prop_a')
  })

  it('a release on its own slot writes nothing', async () => {
    await drag('Alpha', 30, 42, 30)
    expect(save).not.toHaveBeenCalled()
  })
})

describe('VisibilityFrame — the rows', () => {
  it('draws a Context row with the Context’s own icon', async () => {
    useSession.setState({
      tree: {
        contexts: [{ def: { id: 'ctx_areas', title: 'Areas', icon: 'hash' }, spaces: [] }],
        collections: [],
        config: { personalization: { defaultIcons: {} } },
      } as never,
    })
    await act(async () => {
      root.render(
        <VisibilityFrame
          schema={schema}
          view={{ ...view, property_order: [...(view.property_order ?? []), 'ctx_areas'] }}
          back={{ label: 'Settings', onBack: () => {} }}
          save={save}
        />,
      )
    })
    expect(row('Areas').querySelector('.lucide-hash')).not.toBeNull()
  })
})

describe('VisibilityFrame — the eyes', () => {
  const mount = async (): Promise<void> => {
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
          schema={schema}
          view={view}
          back={{ label: 'Settings', onBack: () => {} }}
          save={save}
        />,
      )
    })
  }
  const eye = (label: string): HTMLButtonElement =>
    document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!

  it('draws no eye on Title, a shown row’s eye revealed from its row, and a hidden row’s crossed-out eye standing', async () => {
    await mount()
    expect(row('Title').querySelector('button')).toBeNull()
    expect(eye('Hide Alpha').classList.contains(revealDim)).toBe(true)
    expect(row('Alpha').getAttribute('data-reveal-host')).toBe('')
    expect(eye('Show Gamma').classList.contains(revealDim)).toBe(false)
  })

  it('hides a shown property by its eye, and shows a hidden one by its own', async () => {
    await mount()
    await act(async () => eye('Hide Alpha').click())
    expect(save).toHaveBeenLastCalledWith(
      expect.objectContaining({ hidden_properties: ['prop_c', 'prop_a'] }),
    )
    await act(async () => eye('Show Gamma').click())
    expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ hidden_properties: [] }))
  })
})
