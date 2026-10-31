// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { useVirtualRows } from '@pommora/uix/Interactions/virtualRows'
import { dropOutlineOpen } from '@pommora/uix/Menus/listed-outline.css'
import { Icon } from '@pommora/uix/Symbols'
import { rowIndent } from '@pommora/uix/Table/rowIndent'
import { text } from '@pommora/uix/Theme'
import { size } from '@pommora/uix/Theme/theme-vars.css'
import { DEFAULT_ENTITY_ICONS } from '../Assets/entityIconPolicy'
import { propertyTypeIconName } from '../Properties/typeDisplay'
import { boxOf, bundleRow, rowOf } from '../Testing/bundles'
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
            toggle,
            rowClick,
            openMenu,
          }}
          date={{
            when: () => 'Today',
            onContextMenu: vi.fn(),
            sample: '',
            measureRef: vi.fn(),
            width: null,
          }}
          scrollEl={null}
        />,
      ),
    )
  const rowEls = (): HTMLElement[] => [...host.querySelectorAll<HTMLElement>('.data-row')]
  const chevronOf = (title: string): Element | null =>
    rowOf(host, title).querySelector('[data-drop-outline]')
  const indentOf = (title: string): string =>
    (rowOf(host, title).querySelector('.bundle-title') as HTMLElement).style.marginLeft
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

  it('a top-level container’s chevron follows its title, a nested one’s sits in the rail slot before its icon, each open as its row is, a container’s title is emphasized where a page’s is not, and each row indents by its depth', async () => {
    await render(nested())
    expect(chevronOf('Notes')?.previousElementSibling?.classList.contains('cell-title')).toBe(true)
    const slot = chevronOf('Ideas')?.parentElement
    expect(slot?.classList.contains('row-chevron')).toBe(true)
    expect(slot?.nextElementSibling?.classList.contains('cell-title')).toBe(true)
    expect(chevronOf('P')).toBeNull()
    const emphasized = (title: string): boolean | undefined =>
      rowOf(host, title).querySelector('.cell-title-text')?.classList.contains(text.body.emphasized)
    expect([emphasized('Notes'), emphasized('Ideas'), emphasized('P')]).toEqual([true, true, false])
    expect(
      ['Notes', 'Ideas'].map((t) => chevronOf(t)?.classList.contains(dropOutlineOpen)),
    ).toEqual([true, false])
    expect([indentOf('Notes'), indentOf('Ideas'), indentOf('P')]).toEqual([
      rowIndent(0),
      rowIndent(1),
      rowIndent(1),
    ])
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
      rowOf(host, title).querySelector('.cell-title > svg') as SVGElement
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
      rowOf(host, 'Alpha').querySelector('[role="img"][aria-label="Recorded Partly"]'),
    ).not.toBeNull()
    expect(rowOf(host, 'Beta').querySelector('[role="img"]')).toBeNull()
  })

  it('a click anywhere on a row, its chevron included, hands rowClick its row and detail; a ctrl-click hands it nothing; a right-click opens its menu', async () => {
    const rows = nested()
    await render(rows)
    await act(async () => {
      rowOf(host, 'P').dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 2 }))
      chevronOf('Notes')?.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    })
    expect(rowClick.mock.calls).toEqual([
      [rows[2].row, 2],
      [rows[0].row, 1],
    ])
    rowClick.mockClear()
    await act(async () => {
      rowOf(host, 'P').dispatchEvent(
        new MouseEvent('click', { bubbles: true, detail: 1, ctrlKey: true }),
      )
    })
    expect(rowClick).not.toHaveBeenCalled()
    await act(async () => {
      rowOf(host, 'P').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
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

  it('the rows are one Tab stop whose arrows step between rows, whose Enter hands rowClick the focused row as a keyboard’s click, and whose Space toggles its check', async () => {
    const rows = nested()
    await render(rows)
    const zone = host.querySelector('.line-zone') as HTMLElement
    expect(zone.tabIndex).toBe(0)
    expect(rowEls().map((r) => r.tabIndex)).toEqual([-1, -1, -1])
    await act(async () => zone.focus())
    expect(document.activeElement).toBe(rowOf(host, 'Notes'))
    await key(rowOf(host, 'Notes'), 'ArrowDown')
    expect(document.activeElement).toBe(rowOf(host, 'Ideas'))
    await key(rowOf(host, 'Ideas'), 'Enter')
    await key(rowOf(host, 'Ideas'), ' ')
    expect(rowClick.mock.calls).toEqual([[rows[1].row, 0]])
    expect(toggle).toHaveBeenCalledExactlyOnceWith(rows[1].row.bundlePath)
  })

  it('a focused row is the one the virtualizer keeps drawn', async () => {
    await render(nested())
    const asked = (): unknown => vi.mocked(useVirtualRows).mock.lastCall?.[0].keep
    expect(asked()).toBeNull()
    await act(async () => rowOf(host, 'P').focus())
    expect(asked()).toBe(2)
  })

  it('a row’s box checks it without the row’s click, and stays out of the Tab order', async () => {
    await render(nested())
    expect(boxOf(host, 'Notes').tabIndex).toBe(-1)
    await act(async () => boxOf(host, 'Notes').click())
    expect(toggle).toHaveBeenCalledExactlyOnceWith(COLLECTION)
    expect(rowClick).not.toHaveBeenCalled()
  })

  it('a row’s lead cell holds the hidden rail, and a click on it reaches neither the row nor its box', async () => {
    await render(nested())
    const rail = rowOf(host, 'P').querySelector('.cell-lead')?.firstElementChild as HTMLElement
    expect(rail.getAttribute('aria-hidden')).toBe('true')
    await act(async () => {
      rail.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    })
    expect(rowClick).not.toHaveBeenCalled()
    expect(toggle).not.toHaveBeenCalled()
  })

  it('every row’s box shows while any row in view is checked, and none while the only checked row is out of view', async () => {
    await render(nested())
    expect(rowEls().map((r) => r.dataset.revealHost)).toEqual(['', '', ''])
    await render(nested(), [SET])
    expect(rowEls().map((r) => r.dataset.revealHost)).toEqual(['on', 'on', 'on'])
    await render(nested(), ['.trash/Hidden.deleted'])
    expect(rowEls().map((r) => r.dataset.revealHost)).toEqual(['', '', ''])
  })
})
