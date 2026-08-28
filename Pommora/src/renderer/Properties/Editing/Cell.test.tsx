// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { ColumnStyle } from '@shared/columnStyles'
import type { PropertyDefinition } from '@shared/properties'
import type { ResolvedColumn, ViewRow } from '@shared/types'

import { EMPTY_ASSET_MAP } from '@shared/types'
import { Cell } from '@renderer/Properties/Editing/Cell'
import type { ResolveContext } from '@renderer/Properties/resolveContext'
import { propsAtRoot } from '@renderer/testing/propsAtRoot'
import { labelColor } from '@renderer/DesignSystem/Labels'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// The DualSwitch's GlassSegment (liquid glass) measures itself; jsdom has no ResizeObserver.
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
        options: [{ value: 'not_started', label: 'Not started', group_id: 'upcoming' }],
      },
      {
        id: 'in_progress',
        label: 'In Progress',
        color: 'blue',
        options: [{ value: 'active', label: 'Active', color: 'blue', group_id: 'in_progress' }],
      },
      {
        id: 'done',
        label: 'Done',
        color: 'green',
        options: [{ value: 'complete', label: 'Complete', color: 'green', group_id: 'done' }],
      },
    ],
  },
  { id: 'prop_done', name: 'Done', type: 'checkbox' },
  { id: 'prop_pin', name: 'Pinned', type: 'checkbox', checkbox_color: 'blue' },
  { id: 'prop_when', name: 'When', type: 'datetime' },
  { id: 'prop_n', name: 'Count', type: 'number' },
  { id: 'prop_files', name: 'Files', type: 'file' },
]
const ctx = {
  schema,
  contextsById: new Map(),
  assets: EMPTY_ASSET_MAP,
} as unknown as ResolveContext

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

const mount = (row: ViewRow, columnId: string, style: ColumnStyle): void => {
  act(() =>
    root.render(<Cell row={row} column={col(columnId)} ctx={ctx} hideIcon={false} style={style} />),
  )
}

describe('status looks', () => {
  const row = rowWith({ prop_status: 'active' })

  it('standard renders the labeled chip', () => {
    mount(row, 'prop_status', { look: 'standard' })
    expect(host.textContent).toContain('Active')
  })

  it('compact renders the icon-only chip — glyph by group, no label', () => {
    mount(row, 'prop_status', { look: 'compact' })
    expect(host.textContent).not.toContain('Active')
    expect(host.querySelector('svg')).toBeTruthy()
  })
})

describe('checkbox looks', () => {
  it('switch renders the real DualSwitch, checked from the value', () => {
    mount(rowWith({ prop_done: true }), 'prop_done', { look: 'switch' })
    const sw = host.querySelector('[role="switch"]')
    expect(sw).toBeTruthy()
    expect(sw?.getAttribute('aria-checked')).toBe('true')
  })

  it('checkbox keeps the chip square', () => {
    mount(rowWith({ prop_done: true }), 'prop_done', { look: 'checkbox' })
    expect(host.querySelector('[role="switch"]')).toBeNull()
    expect(host.querySelector('svg')).toBeTruthy()
  })

  it('renders the empty box even with no stored value — always checkable in place', () => {
    mount(rowWith({}), 'prop_done', { look: 'checkbox' })
    expect(host.querySelector('span')).toBeTruthy() // the box renders...
    expect(host.querySelector('svg')).toBeNull() // ...unchecked, no glyph
  })

  it('switch renders unchecked with no stored value', () => {
    mount(rowWith({}), 'prop_done', { look: 'switch' })
    expect(host.querySelector('[role="switch"]')?.getAttribute('aria-checked')).toBe('false')
  })

  it('checked box tints the property color, check at label-control', () => {
    mount(rowWith({ prop_pin: true }), 'prop_pin', { look: 'checkbox' })
    const box = host.querySelector('span')
    expect(box?.style.getPropertyValue('--label-base')).not.toBe('') // tinted, not the grey default
    expect(box?.className).not.toContain(labelColor.default)
    expect(box?.style.color).toBe('var(--label-control)')
  })

  it('unchecked box is the neutral grey default, untinted', () => {
    mount(rowWith({}), 'prop_pin', { look: 'checkbox' })
    const box = host.querySelector('span')
    expect(box?.className).toContain(labelColor.default)
    expect(box?.style.getPropertyValue('--label-base')).toBe('')
  })

  it('a colorless checked box tints the configured accent via var(--accent), matching the switch', () => {
    mount(rowWith({ prop_done: true }), 'prop_done', { look: 'checkbox' }) // prop_done has no checkbox_color
    const box = host.querySelector('span')
    expect(box?.style.getPropertyValue('--label-base')).toBe('var(--accent)')
  })

  it('scopes --accent to the property color so the switch on-track tints', () => {
    mount(rowWith({ prop_pin: true }), 'prop_pin', { look: 'switch' })
    const wrap = host.querySelector('span')
    expect(wrap?.style.getPropertyValue('--accent')).not.toBe('')
  })

  it('leaves --accent unset when no color is chosen so the switch inherits the configured accent', () => {
    mount(rowWith({ prop_done: true }), 'prop_done', { look: 'switch' })
    const wrap = host.querySelector('span')
    expect(wrap?.style.getPropertyValue('--accent')).toBe('')
  })
})

describe('formats', () => {
  it('datetime renders per the saved formats', () => {
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
