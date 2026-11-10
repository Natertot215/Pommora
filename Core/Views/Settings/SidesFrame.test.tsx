// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { Root } from 'react-dom/client'
import { hiddenRow } from '@pommora/uix/Menus/frames.css'
import { heading } from '@pommora/uix/Menus/menu-row.css'
import { ok } from '../../Contract/result'
import type { PropertyDefinition } from '../../Properties/properties'
import { useSession } from '../../Session/store'
import { mountEachTest } from '../../Testing/viewHarness'
import { stubDialer } from '../../vitest.setup'
import type { SavedView } from '../views'
import { SidesFrame } from './SidesFrame'
import { column } from './sides-frame.css'

const save = vi.fn()
const menu = vi.fn(async (_ask: { items: unknown[] }) => ok('move'))

const schema: PropertyDefinition[] = [
  { id: 'prop_s', label: 'Stage', key: 'Stage', type: 'select' },
  { id: 'prop_d', label: 'Due', key: 'Due', type: 'dateTime' },
  { id: 'prop_n', label: 'Count', key: 'Count', type: 'number' },
]
const view: SavedView = {
  id: 'view_l',
  name: 'List',
  type: 'list',
  property_order: ['_title', 'prop_s', 'prop_d', 'prop_n'],
  hidden_properties: ['prop_n'],
}

let root: Root
mountEachTest((_h, r) => {
  root = r
})

beforeEach(async () => {
  save.mockClear()
  menu.mockClear()
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({ menu })
  useSession.setState({
    tree: {
      contexts: [],
      collections: [],
      config: { personalization: { defaultIcons: {} } },
    } as never,
  })
  await act(async () => {
    root.render(
      <SidesFrame
        schema={schema}
        view={view}
        back={{ label: 'Settings', onBack: () => {} }}
        save={save}
      />,
    )
  })
})

const columns = (): Element[] => [...document.querySelectorAll(`.${column}`)]
const labelIn = (scope: Element, name: string): HTMLElement =>
  [...scope.querySelectorAll<HTMLElement>('*')].find(
    (e) => e.children.length === 0 && e.textContent?.trim() === name,
  )!
const eyes = (scope: Element): string[] =>
  [...scope.querySelectorAll('button[aria-label]')].map((b) => b.getAttribute('aria-label')!)
const rightClick = async (scope: Element, name: string): Promise<void> => {
  await act(async () => {
    labelIn(scope, name).dispatchEvent(
      new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
    )
  })
}

describe('SidesFrame — the columns', () => {
  it('heads its two columns Left and Right with the menu heading', () => {
    expect(
      columns().map((c) => c.querySelector(`.${heading.split(' ').join('.')}`)?.textContent),
    ).toEqual(['Left', 'Right'])
  })

  it('lists Title among Left’s rows with a disabled eye', () => {
    const [left] = columns()
    expect(labelIn(left, 'Title')).toBeDefined()
    expect(eyes(left)).toEqual(['Always Shown', 'Hide Stage'])
    expect(
      left.querySelector<HTMLButtonElement>('button[aria-label="Always Shown"]')!.disabled,
    ).toBe(true)
  })

  it('sets a hidden property ghosted at its own column’s foot, the unplaced stamps at Right’s', () => {
    const [left, right] = columns()
    expect(eyes(right)).toEqual([
      'Hide Due',
      'Show Count',
      'Show Creation Time',
      'Show Last Modified',
    ])
    expect(labelIn(right, 'Count').closest(`.${hiddenRow}`)).not.toBeNull()
    expect(labelIn(right, 'Due').closest(`.${hiddenRow}`)).toBeNull()
    expect(eyes(left)).not.toContain('Show Count')
  })
})

describe('SidesFrame — a row’s controls', () => {
  it('hides a shown property and shows a hidden one by its eye', async () => {
    await act(async () => {
      document.querySelector<HTMLButtonElement>('button[aria-label="Hide Due"]')!.click()
    })
    expect(save).toHaveBeenLastCalledWith({ hidden_properties: ['prop_n', 'prop_d'] })
    await act(async () => {
      document.querySelector<HTMLButtonElement>('button[aria-label="Show Count"]')!.click()
    })
    expect(save).toHaveBeenLastCalledWith({
      property_order: ['_title', 'prop_s', 'prop_d', 'prop_n'],
      hidden_properties: [],
    })
  })

  it('offers Move to Right on a Left row and writes its side', async () => {
    await rightClick(columns()[0], 'Stage')
    expect(menu).toHaveBeenCalledOnce()
    expect(menu.mock.calls[0][0]).toMatchObject({
      items: [{ label: 'Move to Right', action: 'move' }],
    })
    expect(save).toHaveBeenCalledExactlyOnceWith({ column_sides: { prop_s: 'right' } })
  })

  it('offers Move to Left on a Right row, a hidden one included', async () => {
    await rightClick(columns()[1], 'Count')
    expect(menu.mock.calls[0][0]).toMatchObject({
      items: [{ label: 'Move to Left', action: 'move' }],
    })
    expect(save).toHaveBeenCalledExactlyOnceWith({ column_sides: { prop_n: 'left' } })
  })

  it('offers Title no side', async () => {
    await rightClick(columns()[0], 'Title')
    expect(menu).not.toHaveBeenCalled()
    expect(save).not.toHaveBeenCalled()
  })
})
