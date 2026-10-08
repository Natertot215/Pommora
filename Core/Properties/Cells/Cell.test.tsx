// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { type ColumnStyle, dateDefaults } from '../columnStyles'
import type { PropertyDefinition } from '../properties'
import type { PropertyValue } from '../propertyValue'
import type { ResolvedColumn, ViewRow } from '../../Views/viewRow'

import { EMPTY_ASSET_MAP } from '../../Nexus/tree'
import { Cell } from './Cell'
import type { ValueContext } from '../valueContext'
import type { ConnectionsApi } from '../../MarkdownPM/Links/connectionsApi'
import { propsAtRoot } from '../../Testing/pageValues'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// The DualSwitch's GlassControl (liquid glass) measures itself; jsdom has no ResizeObserver.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

const schema: PropertyDefinition[] = [
  {
    id: 'prop_status',
    name: 'Status',
    type: 'status',
    status_groups: [
      {
        id: 'upcoming',
        label: 'Upcoming',
        color: 'gray',
        options: [{ value: 'not_started', group_id: 'upcoming' }],
      },
      {
        id: 'in_progress',
        label: 'In Progress',
        color: 'blue',
        options: [{ value: 'active', color: 'blue', group_id: 'in_progress' }],
      },
      {
        id: 'done',
        label: 'Done',
        color: 'green',
        options: [{ value: 'complete', color: 'green', group_id: 'done' }],
      },
    ],
  },
  { id: 'prop_done', name: 'Done', type: 'checkbox' },
  { id: 'prop_pin', name: 'Pinned', type: 'checkbox', checkbox_color: 'blue' },
  { id: 'prop_when', name: 'When', type: 'dateTime' },
  { id: 'prop_n', name: 'Count', type: 'number' },
  { id: 'prop_files', name: 'Files', type: 'file' },
  { id: 'prop_tags', name: 'Tags', type: 'multiSelect' },
  { id: 'prop_notes', name: 'Notes', type: 'text' },
]
const ctx = {
  schema,
  contextsById: new Map(),
  assets: EMPTY_ASSET_MAP,
} as unknown as ValueContext

const col = (id: string): ResolvedColumn => ({ id, kind: 'property' })
const rowWith = (properties: Record<string, unknown>): ViewRow =>
  ({
    id: 'p1',
    title: 'Page',
    path: 'X/Page.md',
    frontmatter: { id: 'p1', ...propsAtRoot(properties, schema) },
  }) as unknown as ViewRow

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const mount = (
  row: ViewRow,
  columnId: string,
  style: Partial<ColumnStyle>,
  edit: { commit?: (next: PropertyValue | null) => void; hideRemove?: boolean } = {},
): void => {
  act(() =>
    root.render(
      <Cell
        row={row}
        column={col(columnId)}
        ctx={ctx}
        hideIcon={false}
        style={{ ...dateDefaults('full'), ...style }}
        {...edit}
      />,
    ),
  )
}

describe('status looks', () => {
  const row = rowWith({ prop_status: 'active' })

  it('standard renders the labeled chip', () => {
    mount(row, 'prop_status', { look: 'standard' })
    expect(host.textContent).toContain('active')
  })

  it('compact renders the icon-only chip — glyph by group, no label', () => {
    mount(row, 'prop_status', { look: 'compact' })
    expect(host.textContent).not.toContain('active')
    expect(host.querySelector('svg')).toBeTruthy()
  })
})

describe('checkbox looks', () => {
  it('switch renders the display-only DualSwitch, on from the value, with no tab stop', () => {
    mount(rowWith({ prop_done: true }), 'prop_done', { look: 'switch' })
    expect(host.querySelector('button')).toBeNull()
    expect(host.querySelector('.cell-switch > span')?.className).toMatch(/trackOn/)
  })

  it('checkbox keeps the chip square', () => {
    mount(rowWith({ prop_done: true }), 'prop_done', { look: 'checkbox' })
    expect(host.querySelector('[role="switch"]')).toBeNull()
    expect(host.querySelector('svg')).toBeTruthy()
  })

  it('renders the empty box even with no stored value — always checkable in place', () => {
    mount(rowWith({}), 'prop_done', { look: 'checkbox' })
    expect(host.querySelector('span')).toBeTruthy()
    expect(host.querySelector('svg')).toBeNull()
  })

  it('switch renders off with no stored value', () => {
    mount(rowWith({}), 'prop_done', { look: 'switch' })
    expect(host.querySelector('.cell-switch > span')?.className).not.toMatch(/trackOn/)
  })

  it('checked box tints from the property color via --checkbox-base', () => {
    mount(rowWith({ prop_pin: true }), 'prop_pin', { look: 'checkbox' })
    const box = host.querySelector('span')
    expect(box?.style.getPropertyValue('--checkbox-base')).not.toBe('')
    expect(box?.className).toContain('checkbox-checked')
  })

  it('unchecked box is filled and untinted', () => {
    mount(rowWith({}), 'prop_pin', { look: 'checkbox' })
    const box = host.querySelector('span')
    expect(box?.className).toContain('checkbox-filled')
    expect(box?.className).not.toContain('checkbox-checked')
  })

  it('a colorless checked box leaves --checkbox-base unset so it follows the Nexus', () => {
    mount(rowWith({ prop_done: true }), 'prop_done', { look: 'checkbox' })
    const box = host.querySelector('span')
    expect(box?.className).toContain('checkbox-checked')
    expect(box?.style.getPropertyValue('--checkbox-base')).toBe('')
  })

  it('paints the switch in the property color through the same --checkbox-base as the box', () => {
    mount(rowWith({ prop_pin: true }), 'prop_pin', { look: 'switch' })
    const track = host.querySelector<HTMLElement>('.cell-switch > span')
    expect(track?.style.getPropertyValue('--checkbox-base')).not.toBe('')
  })

  it('leaves --checkbox-base unset when no color is chosen so the switch follows the Nexus', () => {
    mount(rowWith({ prop_done: true }), 'prop_done', { look: 'switch' })
    const track = host.querySelector<HTMLElement>('.cell-switch > span')
    expect(track?.style.getPropertyValue('--checkbox-base')).toBe('')
  })
})

describe('formats', () => {
  it('dateTime renders per the saved formats', () => {
    mount(rowWith({ prop_when: '2026-03-01' }), 'prop_when', {
      date_format: 'short',
      time_format: 'none',
    })
    expect(host.textContent).toBe('March 1st')
  })

  it('number renders per the def-level format (grouped by default)', () => {
    mount(rowWith({ prop_n: 1234.5 }), 'prop_n', {})
    expect(host.textContent).toBe('1,234.5')
  })
})

describe('a file value', () => {
  it('renders one chip per file, named by the wikilink it holds', () => {
    mount(rowWith({ prop_files: ['[[trip.png]]', '[[doc.pdf]]'] }), 'prop_files', {})
    expect(host.textContent).toContain('trip.png')
    expect(host.textContent).toContain('doc.pdf')
    expect(host.textContent).not.toContain('[[')
  })
})

describe('a chip list', () => {
  const press = (target: EventTarget, key: string): void =>
    act(() => {
      target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
    })
  const chips = (): HTMLElement[] =>
    Array.from(host.querySelectorAll<HTMLElement>('[aria-roledescription="sortable"]'))

  it('reorders through the same commit that removes, keeping the value kind', () => {
    const commit = vi.fn()
    mount(rowWith({ prop_tags: ['a', 'b', 'c'] }), 'prop_tags', {}, { commit })
    chips().forEach((chip, i) => {
      chip.getBoundingClientRect = () => new DOMRect(i * 50, 0, 40, 20)
    })
    press(chips()[0], 'Enter')
    press(window, 'ArrowRight')
    press(window, 'Enter')
    expect(commit).toHaveBeenCalledWith({ kind: 'multiSelect', value: ['b', 'a', 'c'] })
  })

  it('gives a repeated value its own chip, so the one pressed is the one that moves', () => {
    const commit = vi.fn()
    const [a, b] = ['[[a.png]]', '[[b.png]]']
    mount(rowWith({ prop_files: [a, b, a] }), 'prop_files', {}, { commit })
    chips().forEach((chip, i) => {
      chip.getBoundingClientRect = () => new DOMRect(i * 50, 0, 40, 20)
    })
    press(chips()[0], 'Enter')
    press(window, 'ArrowRight')
    press(window, 'Enter')
    expect(commit).toHaveBeenCalledWith({ kind: 'file', value: [b, a, a] })
  })

  it('keeps every chip off the tab order', () => {
    mount(
      rowWith({ prop_files: ['[[a.png]]', '[[b.png]]'] }),
      'prop_files',
      {},
      { commit: vi.fn() },
    )
    expect(chips().map((c) => c.tabIndex)).toEqual([-1, -1])
  })

  it('offers no drag for a lone chip or a read-only value', () => {
    mount(rowWith({ prop_tags: ['a'] }), 'prop_tags', {}, { commit: vi.fn() })
    expect(chips()).toHaveLength(0)
    mount(rowWith({ prop_tags: ['a', 'b'] }), 'prop_tags', {})
    expect(chips()).toHaveLength(0)
  })

  it('hideRemove drops the hover-× on every kind while the drag stays', () => {
    mount(
      rowWith({ prop_files: ['[[a.png]]', '[[b.png]]'] }),
      'prop_files',
      {},
      {
        commit: vi.fn(),
        hideRemove: true,
      },
    )
    expect(host.querySelector('button')).toBeNull()
    expect(chips()).toHaveLength(2)
  })
})

describe('a text value', () => {
  const page = { id: 'p9', title: 'Target', path: 'X/Target.md' }
  const connectionsWith = (menu?: ConnectionsApi['menu']) => (): ConnectionsApi | undefined =>
    ({
      resolve: (title: string) =>
        title === 'Target' ? { status: 'resolved', page } : { status: 'phantom', page: null },
      candidates: () => [],
      open: () => {},
      menu,
    }) as unknown as ConnectionsApi

  it('renders every line of the value, each on its own; the one-line clip is the class, not a slice', () => {
    mount(rowWith({ prop_notes: 'first line\nsecond line' }), 'prop_notes', {})
    const lines = [...host.querySelectorAll('.cell-text > .cell-text-line')]
    expect(lines.map((l) => l.textContent)).toEqual(['first line', 'second line'])
  })
  it('colors a link it holds through the context’s connections, as a resting table cell does', () => {
    act(() =>
      root.render(
        <Cell
          row={rowWith({ prop_notes: 'see [[Target]] and [[Nowhere]]' })}
          column={col('prop_notes')}
          ctx={{ ...ctx, connections: connectionsWith() }}
          hideIcon={false}
          style={dateDefaults('full')}
        />,
      ),
    )
    expect(host.querySelector('.md-connection-resolved')?.textContent).toBe('Target')
    expect(host.querySelector('.md-connection-phantom')?.textContent).toBe('Nowhere')
  })
  it('opens the link menu on a right-click over a link it holds, and leaves the rest to the cell menu', () => {
    const menu = vi.fn()
    act(() =>
      root.render(
        <Cell
          row={rowWith({ prop_notes: 'see [[Target]] first' })}
          column={col('prop_notes')}
          ctx={{ ...ctx, connections: connectionsWith(menu) }}
          hideIcon={false}
          style={dateDefaults('full')}
        />,
      ),
    )
    const outer = vi.fn()
    document.addEventListener('contextmenu', outer)
    const press = (el: Element): boolean =>
      el.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 }),
      )
    act(() => press(host.querySelector('.md-connection-resolved')!))
    expect(menu).toHaveBeenCalledWith(expect.objectContaining({ kind: 'page', page }))
    expect(outer).not.toHaveBeenCalled()
    menu.mockClear()
    act(() => press(host.querySelector('.cell-text')!))
    expect(menu).not.toHaveBeenCalled()
    expect(outer).toHaveBeenCalledTimes(1)
    document.removeEventListener('contextmenu', outer)
  })
})
