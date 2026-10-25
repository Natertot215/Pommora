// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { Root } from 'react-dom/client'
import { ok } from '../../Contract/result'
import type { CollectionNode } from '../../Nexus/tree'
import type { PropertyDefinition } from '../../Properties/properties'
import { ID_KEY } from '../../Nexus/identityMark'
import { useSession } from '../../Session/store'
import { mountEachTest, renderView } from '../../Testing/viewHarness'
import { STATUS_DEF } from '../../Testing/definitions'
import { propsAtRoot, valuesReply } from '../../Testing/pageValues'
import { stubDialer } from '../../vitest.setup'
import { makeTree } from '../../Testing/testTree'
// Absent from property_order and blank on every page, so it is the card menu's one addable entry.
const numberDef: PropertyDefinition = { id: 'prop_n', label: 'Count', key: 'Count', type: 'number' }

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
    propertyIds: [STATUS_DEF.id, numberDef.id],
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
  p1: { [ID_KEY]: 'p1', ...propsAtRoot({ prop_status: 'Active' }, [STATUS_DEF]) },
  p2: { [ID_KEY]: 'p2' },
})

let host: HTMLDivElement
let root: Root
mountEachTest((h, r) => {
  host = h
  root = r
})
let mutateSpy: ReturnType<typeof vi.fn>
let selectSpy: ReturnType<typeof vi.fn>
let menuSpy: ReturnType<typeof vi.fn>
let menuAnswer: string | null

beforeEach(() => {
  mutateSpy = vi.fn(async (req: { op: string; id?: string }) =>
    req.op === 'createPage' ? { created: { path: 'Col/Untitled.md' } } : {},
  )
  selectSpy = vi.fn(async () => {})
  menuAnswer = null
  menuSpy = vi.fn(async () => ok(menuAnswer))
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'view:loadValues': async () => VALUES,
    'views:save': async () => ({ ok: true, value: { id: 'view_1' } }),
    menu: menuSpy,
  })
  useSession.setState({
    tree: makeTree({ registry: [STATUS_DEF, numberDef] }),
    selection: { kind: 'none' } as never,
    renamingPath: null,
    tabs: [] as never,
    pinned: [] as never,
    mutate: mutateSpy as never,
    select: selectSpy as never,
  })
})

const card = (id: string): HTMLElement => host.querySelector(`[data-rid="${id}"]`) as HTMLElement
const titleIn = (id: string): HTMLElement => card(id).querySelector('.card-title') as HTMLElement
const portalButtons = (): HTMLElement[] => [
  ...document.querySelectorAll<HTMLElement>(
    '[data-picker-portal] [role="button"], [data-picker-portal] button',
  ),
]
// The icon picker is the only seat here carrying a search field.
const iconSeats = (): number => document.querySelectorAll('[data-picker-portal] input').length
// A picker portals a shield alongside its pane; the pane is the half holding the options.
const openPanes = (): number =>
  [...document.querySelectorAll('[data-picker-portal]')].filter((e) =>
    e.querySelector('[role="button"], button'),
  ).length

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
    // An undefined newTab: the tab-open preference decides where a plain click lands.
    expect(selectSpy.mock.calls.at(-1)).toEqual([
      { kind: 'page', id: 'p1', path: 'Col/One.md' },
      { newTab: undefined, heading: undefined },
    ])

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
      value: { kind: 'select', value: 'opt_Complete' },
    })
  })

  it('an option created while the picker is open joins its list', async () => {
    await renderView(root, source())
    await act(async () => {
      ;(card('p1').querySelector('.card-value') as HTMLElement).click()
    })
    const [first, ...rest] = STATUS_DEF.status_groups ?? []
    const fresh = { id: 'opt_Fresh', key: 'Fresh', label: 'Fresh' }
    const grown = {
      ...STATUS_DEF,
      status_groups: [{ ...first, options: [...first.options, fresh] }, ...rest],
    }
    await act(async () => {
      useSession.setState({ tree: makeTree({ registry: [grown, numberDef] }) })
    })
    expect(portalButtons().some((b) => b.textContent?.trim() === 'Fresh')).toBe(true)
  })
})

describe('the card menu', () => {
  it('carries the Properties branch, and no Add Property row beside it', async () => {
    await renderView(root, source())
    await rightClick('p1', null)
    const items = (menuSpy.mock.calls.at(-1)?.[0] as { items: Array<{ label: string }> }).items
    expect(items.map((i) => i.label)).toContain('Properties')
    expect(items.map((i) => i.label)).not.toContain('Add Property')
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
    expect(mutateSpy).toHaveBeenCalledWith(expect.objectContaining({ op: 'createPage' }))
  })
})

describe('a card’s link value', () => {
  const siteDef: PropertyDefinition = { id: 'prop_site', label: 'Site', key: 'Site', type: 'link' }

  it('pops the link menu, which closes with Clear and Remove', async () => {
    const base = source()
    const withSite = {
      ...base,
      propertyIds: [STATUS_DEF.id, numberDef.id, siteDef.id],
      views: base.views?.map((v) => ({
        ...v,
        property_order: ['_title', 'prop_status', 'prop_site'],
      })),
    } as CollectionNode
    useSession.setState({ tree: makeTree({ registry: [STATUS_DEF, numberDef, siteDef] }) })
    ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
      'view:loadValues': async () =>
        valuesReply({
          p1: { [ID_KEY]: 'p1', ...propsAtRoot({ prop_site: 'https://a.com' }, [siteDef]) },
          p2: { [ID_KEY]: 'p2' },
        }),
      menu: menuSpy,
    })
    await renderView(root, withSite)
    const value = [...card('p1').querySelectorAll<HTMLElement>('.card-value')].at(-1) as HTMLElement
    await act(async () => {
      value.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    const items = menuSpy.mock.calls[0][0].items as { action?: string }[]
    expect(items.map((i) => i.action)).toEqual([
      'link:window',
      'link:browser',
      'rename',
      'editLink',
      'title:copylink',
      'cell:clear',
      'cell:hide',
    ])
  })
})

describe('the card’s Add chooser', () => {
  const stageDef: PropertyDefinition = {
    id: 'prop_stage',
    label: 'Stage',
    key: 'Stage',
    type: 'select',
    select_options: [{ id: 'opt_early', key: 'Early', label: 'Early' }],
  }
  const dueDef: PropertyDefinition = { id: 'prop_due', label: 'Due', key: 'Due', type: 'dateTime' }
  const entry = (name: string): HTMLElement | undefined =>
    portalButtons().find((b) => b.textContent?.includes(name))
  const choose = async (name: string): Promise<void> => {
    const defs = [STATUS_DEF, numberDef, stageDef, dueDef]
    useSession.setState({ tree: makeTree({ registry: defs }) })
    await renderView(root, { ...source(), propertyIds: defs.map((d) => d.id) })
    await act(async () => {
      ;(card('p2').querySelector('.card-text') as HTMLElement).click()
    })
    await act(async () => {
      entry(name)?.click()
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30))
    })
  }

  it('a Select entry slides into its options under ‹ Properties, in the same pane', async () => {
    await choose('Stage')
    expect(entry('Properties')?.textContent).toContain('Stage')
    expect(entry('Early')).toBeTruthy()
    expect(openPanes()).toBe(1)
  })

  it('a Date entry opens its own calendar', async () => {
    await choose('Due')
    const shown = [...document.querySelectorAll('[data-picker-portal]')].map((e) => e.textContent)
    expect(shown.join('')).toContain('Mon')
  })
})
