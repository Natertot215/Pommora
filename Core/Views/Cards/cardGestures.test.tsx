// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ok } from '@pommora/core/Contract/result'
import type { CollectionNode } from '@pommora/core/Nexus/tree'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import { ID_KEY } from '@pommora/core/Nexus/identityMark'
import { useSession } from '../../Session/store'
import { installViewEnvironment, STATUS_DEF, renderView } from '../../Testing/viewHarness'
import { propsAtRoot, valuesReply } from '../../Testing/pageValues'
import { stubDialer } from '../../vitest.setup'

installViewEnvironment()
// Absent from property_order and blank on every page, so it is the card menu's one addable entry.
const numberDef: PropertyDefinition = { id: 'prop_n', name: 'Count', type: 'number' }

const source = (): CollectionNode =>
  ({
    kind: 'collection',
    id: 'col1',
    title: 'Col',
    path: 'Col',
    sets: [],
    pages: [
      { kind: 'page', id: 'p1', title: 'One', path: 'Col/One.md' },
      { kind: 'page', id: 'p2', title: 'Two', path: 'Col/Two.md' },
    ],
    properties: [STATUS_DEF, numberDef],
    views: [
      {
        id: 'view_1',
        name: 'Cards',
        type: 'cards',
        property_order: ['_title', 'prop_status'],
        hidden_properties: [],
        group: { kind: 'structural' },
      },
    ],
  }) as unknown as CollectionNode

const VALUES = valuesReply({
  p1: { [ID_KEY]: 'p1', ...propsAtRoot({ prop_status: 'active' }, [STATUS_DEF]) },
  p2: { [ID_KEY]: 'p2' },
})

let host: HTMLDivElement
let root: Root
let mutateSpy: ReturnType<typeof vi.fn>
let selectSpy: ReturnType<typeof vi.fn>
let menuSpy: ReturnType<typeof vi.fn>
let menuAnswer: string | null

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  mutateSpy = vi.fn(async (req: { op: string }, onCreated?: (c: unknown) => void) => {
    if (req.op === 'createPage') onCreated?.({ id: 'p3', path: 'Col/Untitled.md' })
    return true
  })
  selectSpy = vi.fn(async () => {})
  menuAnswer = null
  menuSpy = vi.fn(async () => ok(menuAnswer))
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'view:loadValues': async () => VALUES,
    'views:save': async () => ({ ok: true, value: { id: 'view_1' } }),
    menu: menuSpy,
  })
  useSession.setState({
    tree: { collections: [], contexts: [], personalization: {}, nexus: { id: 'nx' } } as never,
    selection: { kind: 'none' } as never,
    renamingPath: null,
    tabs: [] as never,
    pinned: [] as never,
    mutate: mutateSpy as never,
    select: selectSpy as never,
  })
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const card = (id: string): HTMLElement => host.querySelector(`[data-rid="${id}"]`) as HTMLElement
const titleIn = (id: string): HTMLElement => card(id).querySelector('.card-title') as HTMLElement
const portalButtons = (): HTMLButtonElement[] => [
  ...document.querySelectorAll<HTMLButtonElement>('[data-picker-portal] button'),
]
// The icon picker is the only seat here carrying a search field.
const iconSeats = (): number => document.querySelectorAll('[data-picker-portal] input').length
// A picker portals a shield alongside its pane; the pane is the half holding the options.
const openPanes = (): number =>
  [...document.querySelectorAll('[data-picker-portal]')].filter((e) => e.querySelector('button'))
    .length

const clickTitle = async (id: string, metaKey: boolean): Promise<void> => {
  const el = titleIn(id)
  document.elementFromPoint = () => el
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, metaKey }))
  })
}

const rightClick = async (id: string, answer: string | null): Promise<void> => {
  menuAnswer = answer
  await act(async () => {
    card(id).dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
  })
  await act(async () => {})
}

describe('opening a card', () => {
  it('a title click selects the page; ⌘ sends it to a new tab', async () => {
    await renderView(root, source())
    await clickTitle('p1', false)
    // No second argument: the tab-open preference decides where a plain click lands.
    expect(selectSpy.mock.calls.at(-1)).toEqual([{ kind: 'page', id: 'p1', path: 'Col/One.md' }])

    selectSpy.mockClear()
    await clickTitle('p1', true)
    expect(selectSpy).toHaveBeenCalledWith(
      { kind: 'page', id: 'p1', path: 'Col/One.md' },
      { newTab: true },
    )
  })
})

describe('a card value', () => {
  it('a status click opens one picker at the root, and a pick writes the value', async () => {
    await renderView(root, source())
    await act(async () => {
      ;(card('p1').querySelector('.card-value') as HTMLElement).click()
    })
    expect(openPanes()).toBe(1)

    const complete = portalButtons().find((b) => b.textContent?.includes('Complete'))
    expect(complete).toBeTruthy()
    await act(async () => {
      complete?.click()
    })
    expect(mutateSpy).toHaveBeenCalledWith({
      op: 'setProperty',
      path: 'Col/One.md',
      propertyId: 'prop_status',
      value: { kind: 'select', value: 'complete' },
    })
  })
})

describe('the card menu', () => {
  it('offers Add Property while a blank addable property stands', async () => {
    await renderView(root, source())
    await rightClick('p1', null)
    const items = (menuSpy.mock.calls.at(-1)?.[0] as { items: Array<{ label: string }> }).items
    expect(items.map((i) => i.label)).toContain('Add Property')
  })

  it('answering Icon mounts the one root icon picker', async () => {
    await renderView(root, source())
    expect(iconSeats()).toBe(0)
    await rightClick('p1', 'title:icon')
    expect(iconSeats()).toBe(1)
  })

  it('answering New Page Below creates one seated after the anchor', async () => {
    await renderView(root, source())
    await rightClick('p1', 'title:newbelow')
    expect(mutateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        op: 'createPage',
        parentPath: 'Col',
        order: ['p1', '$new-page', 'p2'],
      }),
      expect.any(Function),
    )
  })
})
