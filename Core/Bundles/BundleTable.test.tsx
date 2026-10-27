// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { useVirtualRows } from '@pommora/uix/Interactions/virtualRows'
import { Icon } from '@pommora/uix/Symbols'
import { text } from '@pommora/uix/Theme'
import { size } from '@pommora/uix/Theme/theme-vars.css'
import { DEFAULT_ENTITY_ICONS } from '../Assets/entityIconPolicy'
import { propertyTypeIconName } from '../Properties/typeDisplay'
import { bundleRow } from '../Testing/fixtures'
import { BundleRows } from './BundleTable'
import type { TreeRow } from './browser'
import type { BundleRow } from './rows'

vi.mock('@pommora/uix/Interactions/virtualRows', async () => ({
  useVirtualRows: vi.fn((await import('../Testing/virtualRows')).useVirtualRows),
}))
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const COLLECTION = '.trash/2026-10-20T12-00-00-000Z__Notes.deleted'
const SET = `${COLLECTION}/Notes/Ideas`

const tree = (row: BundleRow, depth: number, open: boolean | null): TreeRow => ({
  row,
  depth,
  open,
})
const nested = (): TreeRow[] => [
  tree(bundleRow({ title: 'Notes', kind: 'collection', bundlePath: COLLECTION }), 0, true),
  tree(bundleRow({ title: 'Ideas', kind: 'set', bundlePath: SET }), 1, false),
  tree(bundleRow({ title: 'P', bundlePath: `${COLLECTION}/Notes/P.md` }), 1, null),
]

describe('BundleRows', () => {
  let host: HTMLDivElement
  let root: Root
  const toggle = vi.fn()
  const rowClick = vi.fn()
  const openMenu = vi.fn(async () => {})

  const render = async (visible: TreeRow[], checked: string[] = []) =>
    act(async () =>
      root.render(
        <BundleRows
          browser={{
            visible,
            checked: new Set(checked),
            picked: visible.filter((t) => checked.includes(t.row.bundlePath)).map((t) => t.row),
            date: {
              when: () => 'Today',
              onContextMenu: vi.fn(),
              sample: '',
              measureRef: vi.fn(),
              width: null,
            },
            toggle,
            rowClick,
            openMenu,
          }}
          scrollEl={null}
        />,
      ),
    )
  const rowEls = (): HTMLElement[] => [...host.querySelectorAll<HTMLElement>('.data-row')]
  const rowOf = (title: string): HTMLElement =>
    rowEls().find((r) => r.querySelector('.cell-title-text')?.textContent === title) as HTMLElement
  const chevronOf = (title: string): Element | null =>
    rowOf(title).querySelector('[data-drop-outline]')
  const boxOf = (title: string): HTMLButtonElement =>
    rowOf(title).querySelector('[role="checkbox"]') as HTMLButtonElement
  const key = async (el: HTMLElement, k: string): Promise<void> =>
    act(async () => {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
    })

  beforeEach(() => {
    vi.clearAllMocks()
    host = document.body.appendChild(document.createElement('div'))
    root = createRoot(host)
  })
  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
  })

  it('a top-level container’s chevron follows its title, a nested one’s sits in the rail slot before its icon, and a container’s title is emphasized where a page’s is not', async () => {
    await render(nested())
    expect(chevronOf('Notes')?.previousElementSibling?.classList.contains('cell-title')).toBe(true)
    const slot = chevronOf('Ideas')?.parentElement
    expect(slot?.classList.contains('row-chevron')).toBe(true)
    expect(slot?.nextElementSibling?.classList.contains('cell-title')).toBe(true)
    expect(chevronOf('P')).toBeNull()
    const emphasized = (title: string): boolean | undefined =>
      rowOf(title).querySelector('.cell-title-text')?.classList.contains(text.body.emphasized)
    expect([emphasized('Notes'), emphasized('Ideas'), emphasized('P')]).toEqual([true, true, false])
  })

  it('draws each row’s icon at TableView’s body size: an item’s own ahead of its kind’s, and a property’s by its type', async () => {
    await render([
      tree(bundleRow({ title: 'Own', icon: 'hash', bundlePath: '.trash/own' }), 0, null),
      tree(bundleRow({ title: 'Plain', bundlePath: '.trash/plain' }), 0, null),
      tree(
        bundleRow({
          title: 'Count',
          kind: 'property',
          propertyType: 'checkbox',
          bundlePath: '.trash/count',
        }),
        0,
        null,
      ),
    ])
    const iconOf = (title: string): SVGElement =>
      rowOf(title).querySelector('.cell-title > svg') as SVGElement
    const glyph = (svg: Element): string[] => [svg.getAttribute('class') ?? '', svg.innerHTML]
    const drawn = (name: string): string[] => {
      const box = document.createElement('div')
      box.innerHTML = renderToStaticMarkup(<Icon name={name} />)
      return glyph(box.firstElementChild as Element)
    }
    expect(glyph(iconOf('Own'))).toEqual(drawn('hash'))
    expect(glyph(iconOf('Plain'))).toEqual(drawn(DEFAULT_ENTITY_ICONS.page))
    expect(glyph(iconOf('Count'))).toEqual(drawn(propertyTypeIconName('checkbox')))
    expect(['Own', 'Plain', 'Count'].map((t) => iconOf(t).style.fontSize)).toEqual(
      Array(3).fill(size.icon.body),
    )
  })

  it('a partly recorded row shows its mark, spoken as Recorded Partly, and a whole one shows none', async () => {
    await render([
      tree(bundleRow({ title: 'Alpha', partial: true, bundlePath: '.trash/a' }), 0, null),
      tree(bundleRow({ title: 'Beta', bundlePath: '.trash/b' }), 0, null),
    ])
    expect(
      rowOf('Alpha').querySelector('[role="img"][aria-label="Recorded Partly"]'),
    ).not.toBeNull()
    expect(rowOf('Beta').querySelector('[role="img"]')).toBeNull()
  })

  it('a click anywhere on a row, its chevron included, hands rowClick its row and detail; a ctrl-click hands it nothing; a right-click opens its menu', async () => {
    const rows = nested()
    await render(rows)
    await act(async () => {
      rowOf('P').dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 2 }))
      chevronOf('Notes')?.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    })
    expect(rowClick.mock.calls).toEqual([
      [rows[2].row, 2],
      [rows[0].row, 1],
    ])
    rowClick.mockClear()
    await act(async () => {
      rowOf('P').dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1, ctrlKey: true }))
    })
    expect(rowClick).not.toHaveBeenCalled()
    await act(async () => {
      rowOf('P').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    expect(openMenu).toHaveBeenCalledExactlyOnceWith(rows[2].row)
  })

  it('a container row is a tree item whose aria-expanded follows its disclosure, and a page row is one without it', async () => {
    await render(nested())
    expect(rowEls().map((r) => r.getAttribute('role'))).toEqual([
      'treeitem',
      'treeitem',
      'treeitem',
    ])
    expect(rowEls().map((r) => r.getAttribute('aria-expanded'))).toEqual(['true', 'false', null])
  })

  it('the rows are one Tab stop whose arrows step between rows, and whose Enter hands rowClick the focused row as a keyboard’s click and Space as a pointer’s', async () => {
    const rows = nested()
    await render(rows)
    const zone = host.querySelector('.line-zone') as HTMLElement
    expect(zone.tabIndex).toBe(0)
    expect(rowEls().map((r) => r.tabIndex)).toEqual([-1, -1, -1])
    await act(async () => zone.focus())
    expect(document.activeElement).toBe(rowOf('Notes'))
    await key(rowOf('Notes'), 'ArrowDown')
    expect(document.activeElement).toBe(rowOf('Ideas'))
    await key(rowOf('Ideas'), 'Enter')
    await key(rowOf('Ideas'), ' ')
    expect(rowClick.mock.calls).toEqual([
      [rows[1].row, 0],
      [rows[1].row, 1],
    ])
  })

  it('a focused row is the one the virtualizer keeps drawn', async () => {
    await render(nested())
    const asked = (): unknown => vi.mocked(useVirtualRows).mock.lastCall?.[0].keep
    expect(asked()).toBeNull()
    await act(async () => rowOf('P').focus())
    expect(asked()).toBe(2)
  })

  it('a row’s box checks it without the row’s click, and stays out of the Tab order', async () => {
    await render(nested())
    expect(boxOf('Notes').tabIndex).toBe(-1)
    await act(async () => boxOf('Notes').click())
    expect(toggle).toHaveBeenCalledExactlyOnceWith(COLLECTION)
    expect(rowClick).not.toHaveBeenCalled()
  })

  it('a row’s lead cell holds the hidden rail, and a click on it reaches neither the row nor its box', async () => {
    await render(nested())
    const rail = rowOf('P').querySelector('.cell-lead')?.firstElementChild as HTMLElement
    expect(rail.getAttribute('aria-hidden')).toBe('true')
    await act(async () => {
      rail.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    })
    expect(rowClick).not.toHaveBeenCalled()
    expect(toggle).not.toHaveBeenCalled()
  })

  it('every row’s box shows while any row is checked', async () => {
    await render(nested())
    expect(rowEls().map((r) => r.dataset.revealHost)).toEqual(['', '', ''])
    await render(nested(), [SET])
    expect(rowEls().map((r) => r.dataset.revealHost)).toEqual(['on', 'on', 'on'])
  })
})
