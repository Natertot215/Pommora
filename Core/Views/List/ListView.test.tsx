// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { Root } from 'react-dom/client'
import { inlineSegment } from '@pommora/uix/Elements/segment.css'
import { ok } from '../../Contract/result'
import { ID_KEY } from '../../Nexus/identityMark'
import type { CollectionNode } from '../../Nexus/tree'
import type { PropertyDefinition } from '../../Properties/properties'
import { useSession } from '../../Session/store'
import { propsAtRoot } from '../../Testing/pageValues'
import { makeTree } from '../../Testing/testTree'
import { mountEachTest, renderView, settle } from '../../Testing/viewHarness'
import { stubDialer } from '../../vitest.setup'
import type { SavedView } from '../views'

const stageDef: PropertyDefinition = {
  id: 'prop_stage',
  label: 'Stage',
  key: 'Stage',
  type: 'select',
  select_options: [
    { id: 'opt_early', key: 'Early', label: 'Early' },
    { id: 'opt_late', key: 'Late', label: 'Late' },
  ],
}
const dueDef: PropertyDefinition = { id: 'prop_due', label: 'Due', key: 'Due', type: 'dateTime' }
const doneDef: PropertyDefinition = {
  id: 'prop_done',
  label: 'Done',
  key: 'Done',
  type: 'checkbox',
}
const countDef: PropertyDefinition = { id: 'prop_n', label: 'Count', key: 'Count', type: 'number' }
const DEFS = [stageDef, dueDef, doneDef, countDef]

const listView = (extra: Partial<SavedView> = {}): SavedView => ({
  id: 'view_1',
  name: 'List',
  type: 'list',
  property_order: ['_title', 'prop_stage', 'prop_due', 'prop_done', 'prop_n'],
  hidden_properties: [],
  ...extra,
})
const source = (view: SavedView = listView()): CollectionNode =>
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
    propertyIds: DEFS.map((d) => d.id),
    views: [view],
  }) as unknown as CollectionNode

// p1 holds a Stage, a Due, and an unchecked Done, and no Count; p2 holds nothing.
const P1 = { prop_stage: 'Early', prop_due: '2026-03-09', prop_done: false }
const valuesOf = (p1: Record<string, unknown>) =>
  ok({
    p1: {
      frontmatter: { [ID_KEY]: 'p1', ...propsAtRoot(p1, DEFS) },
      createdAt: '2026-01-02T10:00:00.000Z',
      modifiedAt: null,
    },
    p2: { frontmatter: { [ID_KEY]: 'p2' }, createdAt: null, modifiedAt: null },
  })

let host: HTMLDivElement
let root: Root
mountEachTest((h, r) => {
  host = h
  root = r
})
let mutateSpy: ReturnType<typeof vi.fn>
let selectSpy: ReturnType<typeof vi.fn>
let saveSpy: ReturnType<typeof vi.fn>
let values: Record<string, unknown>

beforeEach(() => {
  mutateSpy = vi.fn(async () => ({}))
  selectSpy = vi.fn(async () => {})
  saveSpy = vi.fn(async () => ({ ok: true, value: { id: 'view_1' } }))
  values = P1
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'view:loadValues': async () => valuesOf(values),
    'views:save': saveSpy,
    menu: vi.fn(async () => ok(null)),
  })
  useSession.setState({
    tree: makeTree({ registry: DEFS }),
    selection: { kind: 'none' } as never,
    renamingPath: null,
    pendingPick: null,
    tabs: [] as never,
    pinned: [] as never,
    mutate: mutateSpy as never,
    select: selectSpy as never,
  })
})

const rowOf = (id: string): HTMLElement =>
  host.querySelector(`.list-view [data-rid="${id}"]`) as HTMLElement
const groups = (id: string): HTMLElement[] => [
  ...rowOf(id).querySelectorAll<HTMLElement>('.list-view-group'),
]
const left = (id: string): HTMLElement => groups(id)[0]
const right = (id: string): HTMLElement | null =>
  rowOf(id).querySelector<HTMLElement>('.list-view-right')
const isSegment = (el: Element): boolean => el.classList.contains(inlineSegment.split(' ').at(-1)!)
const plus = (scope: Element): HTMLElement | null =>
  scope.querySelector<HTMLElement>('[aria-label="Add Property"]')
// Each item a group draws, named by what it is: the title, a checkbox, or a value's text.
const items = (group: Element | null): string[] =>
  [...(group?.children ?? [])]
    .filter((e) => !isSegment(e) && e.getAttribute('aria-label') !== 'Add Property')
    .map((e) =>
      e.classList.contains('list-view-title')
        ? 'title'
        : e.querySelector('.cell-checkbox')
          ? 'check'
          : /2026/.test(e.textContent ?? '')
            ? 'date'
            : (e.textContent ?? '').replace(/^(.+?)\1+$/, '$1'),
    )

describe('a List row', () => {
  it('draws the title and a Select on the left and a Date and a Checkbox on the right, in property_order', async () => {
    await renderView(root, source())
    expect(items(left('p1'))).toEqual(['title', 'Early'])
    expect(items(right('p1'))).toEqual(['date', 'check'])
  })

  it('draws a property placed before Title ahead of it', async () => {
    await renderView(
      root,
      source(listView({ property_order: ['prop_stage', '_title', 'prop_due', 'prop_done'] })),
    )
    expect(items(left('p1'))).toEqual(['Early', 'title'])
  })

  it('draws a property on the side column_sides sets', async () => {
    await renderView(root, source(listView({ column_sides: { prop_stage: 'right' } })))
    expect(items(left('p1'))).toEqual(['title'])
    expect(items(right('p1'))[0]).toBe('Early')
  })

  it('leaves a blank value off and draws an unchecked Checkbox', async () => {
    await renderView(root, source())
    expect(rowOf('p1').querySelectorAll('.value-inline')).toHaveLength(3)
    const check = (id: string): Element | null | undefined =>
      right(id)?.querySelector('.cell-checkbox')
    expect(check('p1')?.classList.contains('checkbox-checked')).toBe(false)
    expect(items(left('p2'))).toEqual(['title'])
    expect(items(right('p2'))).toEqual(['check'])
  })

  it('sets a bar between every two items of a group and none before the plus', async () => {
    await renderView(root, source())
    for (const group of groups('p1')) {
      const kids = [...group.children]
      kids.forEach((el, i) => {
        expect(isSegment(el)).toBe(i > 0 && !isSegment(kids[i - 1]))
      })
      expect(isSegment(kids.at(-1)!)).toBe(false)
    }
    expect([...left('p1').children].filter(isSegment)).toHaveLength(1)
    expect([...right('p1')!.children].filter(isSegment)).toHaveLength(1)
  })

  it('trails the right group with the plus, or the left group when the right is empty, and draws none with nothing to add', async () => {
    values = { ...P1, prop_n: 3 }
    await renderView(
      root,
      source(listView({ column_sides: { prop_due: 'left', prop_done: 'left', prop_n: 'left' } })),
    )
    expect(right('p1')).toBeNull()
    expect(plus(rowOf('p1'))?.previousElementSibling).toBe(left('p1'))

    await renderView(root, source())
    expect(plus(rowOf('p1'))?.previousElementSibling).toBe(right('p1'))
    expect(groups('p1').some((g) => plus(g) !== null)).toBe(false)

    useSession.setState({ tree: { ...makeTree({ registry: DEFS }), contexts: [] } })
    await renderView(
      root,
      source(
        listView({
          property_order: [
            '_title',
            'prop_stage',
            'prop_due',
            'prop_done',
            'prop_n',
            '_created_at',
          ],
        }),
      ),
    )
    expect(items(right('p1'))).toHaveLength(4)
    expect(plus(rowOf('p1'))).toBeNull()
  })

  it('opens the page from its title alone, not from the empty stretch or a Created value', async () => {
    await renderView(
      root,
      source(listView({ property_order: ['_title', 'prop_stage', '_created_at'] })),
    )
    const created = right('p1')?.querySelector<HTMLElement>('.value-inline')
    expect(created).toBeTruthy()
    await act(async () => {
      rowOf('p1').querySelector<HTMLElement>('.list-view-line')!.click()
      created!.click()
    })
    expect(selectSpy).not.toHaveBeenCalled()
    expect(document.querySelector('[data-picker-portal]')).toBeNull()

    const title = rowOf('p1').querySelector<HTMLElement>('.cell-title-text')!
    const hit = document.elementFromPoint
    document.elementFromPoint = () => title
    try {
      await act(async () => {
        title.click()
      })
    } finally {
      document.elementFromPoint = hit
    }
    expect(selectSpy.mock.calls.at(-1)?.[0]).toEqual({ kind: 'page', id: 'p1', path: 'Col/One.md' })
  })

  it('opens the Add list from the plus, and a value picked from it shows its property', async () => {
    await renderView(root, source(listView({ property_order: ['_title', 'prop_due'] })))
    const entry = (name: string): HTMLElement | undefined =>
      [...document.querySelectorAll<HTMLElement>('[data-picker-portal] [role="button"]')].find(
        (e) => e.textContent?.includes(name),
      )
    await act(async () => plus(rowOf('p2'))!.click())
    await settle(30)
    expect(plus(rowOf('p2'))?.hasAttribute('data-reveal-held')).toBe(true)
    await act(async () => entry('Stage')!.click())
    await settle(30)
    await act(async () => entry('Late')!.click())
    await settle(30)
    expect(mutateSpy).toHaveBeenCalledWith(
      {
        op: 'setProperty',
        path: 'Col/Two.md',
        propertyId: 'prop_stage',
        value: { kind: 'select', value: 'opt_late' },
      },
      expect.anything(),
    )
    expect(saveSpy).toHaveBeenCalledWith(
      'Col',
      'collection',
      expect.anything(),
      expect.objectContaining({ property_order: expect.arrayContaining(['prop_stage']) }),
    )
  })

  it('keeps the plus and its Add list open when a first right-side value lands from it', async () => {
    await renderView(root, source(listView({ property_order: ['_title', 'prop_stage'] })))
    const add = plus(rowOf('p2'))!
    await act(async () => add.click())
    await settle(30)
    await act(async () => {
      ;[...document.querySelectorAll<HTMLElement>('[data-picker-portal] [role="button"]')]
        .find((e) => e.textContent?.includes('Due'))!
        .click()
    })
    await settle(30)
    await act(async () => {
      document.querySelectorAll<HTMLElement>('[data-picker-portal] [data-k]')[10].click()
    })
    await settle(200)
    expect(items(right('p2'))).toEqual(['date'])
    expect(plus(rowOf('p2'))).toBe(add)
    expect(add.hasAttribute('data-reveal-held')).toBe(true)
    expect(document.querySelector('[data-picker-portal] [data-k]')).not.toBeNull()
  })

  it('outlines its grid unless hide_outlines, and wraps it under wrap_rows', async () => {
    const grid = (): Element => host.querySelector('.list-view .table-grid')!
    await renderView(root, source())
    expect([grid().classList.contains('outlined'), grid().classList.contains('wraps')]).toEqual([
      true,
      false,
    ])
    await renderView(root, source(listView({ hide_outlines: true, wrap_rows: true })))
    expect([grid().classList.contains('outlined'), grid().classList.contains('wraps')]).toEqual([
      false,
      true,
    ])
  })

  it('keeps a later value’s node in place when a value appears ahead of it', async () => {
    const order = ['_title', 'prop_stage', 'prop_n', 'prop_due']
    values = { ...P1, prop_n: 7 }
    await renderView(
      root,
      source(listView({ property_order: order, hidden_properties: ['prop_n'] })),
    )
    const due = right('p1')?.firstElementChild
    expect(items(right('p1'))[0]).toBe('date')
    await renderView(root, source(listView({ property_order: order })))
    expect(items(right('p1'))[0]).toBe('7')
    expect(right('p1')?.children[2]).toBe(due)
  })
})
