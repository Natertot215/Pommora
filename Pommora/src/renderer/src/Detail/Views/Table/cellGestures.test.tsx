// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { PropertyDefinition } from '@shared/properties'
import type { CollectionNode } from '@shared/types'
import { useSession } from '../../../store'
import { PropertyPicker } from '../PropertyEditing/PropertyPicker'
import { TableView } from './TableView'
import { propsAtRoot } from '@renderer/testing/propsAtRoot'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = ResizeObserverStub

const statusDef: PropertyDefinition = {
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
}
const checkboxDef: PropertyDefinition = { id: 'prop_done', name: 'Done', type: 'checkbox' }
const numberDef: PropertyDefinition = { id: 'prop_n', name: 'Count', type: 'number' }
const urlDef: PropertyDefinition = { id: 'prop_link', name: 'Link', type: 'url' }
const fileDef: PropertyDefinition = { id: 'prop_files', name: 'Files', type: 'file' }
const multiDef: PropertyDefinition = {
  id: 'prop_tags',
  name: 'Tags',
  type: 'multi_select',
  select_options: [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
  ],
}

const allDefs: PropertyDefinition[] = [statusDef, checkboxDef, numberDef, urlDef, fileDef, multiDef]

const sourceWith = (columnStyles?: Record<string, { look?: string }>): CollectionNode =>
  ({
    kind: 'collection',
    id: 'col1',
    title: 'Col',
    path: 'Col',
    sets: [],
    pages: [
      { kind: 'page', id: 'p1', title: 'Page One', path: 'Col/Page One.md' },
      { kind: 'page', id: 'p2', title: 'Page Two', path: 'Col/Page Two.md' },
    ],
    properties: [statusDef, checkboxDef, numberDef, urlDef, fileDef],
    views: [
      {
        id: 'view_1',
        name: 'Table',
        type: 'table',
        property_order: [
          '_title',
          'prop_status',
          'prop_done',
          'prop_n',
          'prop_link',
          'prop_files',
          'ctx_areas',
        ],
        hidden_properties: ['_modified_at'],
        ...(columnStyles ? { column_styles: columnStyles } : {}),
      },
    ],
  }) as unknown as CollectionNode

const VALUES = {
  p1: {
    id: 'p1',
    ...propsAtRoot(
      {
        prop_status: 'active',
        prop_done: false,
        prop_n: 42,
        prop_link: 'https://old.com',
        prop_files: ['[[trip.png]]'],
      },
      allDefs,
    ),
  },
  p2: { id: 'p2' },
}

// React intercepts the value property — commit through the native setter so the change event carries.
const typeInto = (input: HTMLInputElement, value: string): void => {
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set?.call(
    input,
    value,
  )
  input.dispatchEvent(new Event('input', { bubbles: true }))
}
const key = (input: HTMLElement, k: string): void => {
  input.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
}

let host: HTMLDivElement
let root: Root
let mutateSpy: ReturnType<typeof vi.fn>
let selectSpy: ReturnType<typeof vi.fn>
let openExternalSpy: ReturnType<typeof vi.fn>

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  mutateSpy = vi.fn(async () => {})
  selectSpy = vi.fn(async () => {})
  openExternalSpy = vi.fn(async () => {})
  ;(window as unknown as { nexus: unknown }).nexus = {
    loadValues: async () => VALUES,
    activeViews: { get: async () => ({}) },
    viewOrders: { get: async () => ({}) },
    views: { save: vi.fn(async () => ({ ok: true, value: { id: 'v1' } })) },
    cellMenu: vi.fn(async () => null),
    connMenu: vi.fn(async () => null),
    columnMenu: vi.fn(async () => null),
    openExternal: openExternalSpy,
  }
  useSession.setState({
    tree: {
      personalization: {},
      contexts: [
        {
          def: { id: 'ctx_areas', title: 'Areas', singular: 'Area' },
          spaces: [
            {
              kind: 'space',
              id: 'area_work',
              title: 'Work',
              path: '.nexus/contexts/Areas/Work',
              contextId: 'ctx_areas',
              color: 'blue',
            },
            {
              kind: 'space',
              id: 'area_life',
              title: 'Personal',
              path: '.nexus/contexts/Areas/Personal',
              contextId: 'ctx_areas',
            },
          ],
        },
      ],
      collections: [],
    } as never,
    selection: { kind: 'none' } as never,
    select: selectSpy as never,
    mutate: mutateSpy as never,
  })
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const mountTable = async (source: CollectionNode): Promise<void> => {
  await act(async () => {
    root.render(<TableView source={source} />)
  })
  await act(async () => {}) // flush the loadValues/activeViews promises
}

const statusCell = (): HTMLElement => {
  const cells = host.querySelectorAll<HTMLElement>('.data-cell')
  return cells[1] // property_order: _title, prop_status, prop_done
}

// The value picker is ONE table-level self-managed pane portaled to document.body (escaping the
// table's overflow clip) — its DOM lives outside `host`, so query it through the portal marker.
const pickerButtons = (): HTMLButtonElement[] => [
  ...document.querySelectorAll<HTMLButtonElement>('[data-picker-portal] button'),
]
const pickerText = (): string =>
  [...document.querySelectorAll('[data-picker-portal]')].map((e) => e.textContent ?? '').join('')

describe('status cell gestures', () => {
  it('single-click opens the PropertyPicker with every option as a chip', async () => {
    await mountTable(sourceWith())
    await act(async () => {
      statusCell().click()
    })
    expect(pickerText()).toContain('Not started')
    expect(pickerText()).toContain('Complete')
    expect(mutateSpy).not.toHaveBeenCalled()
  })

  it('a single-value pick CLOSES the picker once its Bloom-out settles', async () => {
    await mountTable(sourceWith())
    await act(async () => {
      statusCell().click()
    })
    expect(pickerButtons().some((b) => b.textContent?.includes('Complete'))).toBe(true)
    const option = pickerButtons().find((b) => b.textContent?.includes('Complete'))
    await act(async () => {
      option?.click()
    })
    // The exit presence holds the pane through its Bloom-out, then unmounts it.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 450))
    })
    expect(pickerButtons().some((b) => b.textContent?.includes('Not started'))).toBe(false)
  })

  it('picking an option writes the status optimistically through setProperty', async () => {
    await mountTable(sourceWith())
    await act(async () => {
      statusCell().click()
    })
    const option = pickerButtons().find((b) => b.textContent?.includes('Complete'))
    expect(option).toBeTruthy()
    await act(async () => {
      option?.click()
    })
    expect(mutateSpy).toHaveBeenCalledWith({
      op: 'setProperty',
      path: 'Col/Page One.md',
      propertyId: 'prop_status',
      value: { kind: 'select', value: 'complete' },
    })
  })
})

describe('checkbox cell gestures', () => {
  it('single-click toggles the checkbox value', async () => {
    await mountTable(sourceWith())
    const cells = host.querySelectorAll<HTMLElement>('.data-cell')
    await act(async () => {
      cells[2].click()
    })
    expect(mutateSpy).toHaveBeenCalledWith({
      op: 'setProperty',
      path: 'Col/Page One.md',
      propertyId: 'prop_done',
      value: { kind: 'checkbox', value: true },
    })
  })

  it('unchecking a checked box strips the property — no stored false', async () => {
    ;(window as unknown as { nexus: { loadValues: () => Promise<unknown> } }).nexus.loadValues =
      async () => ({
        p1: { id: 'p1', ...propsAtRoot({ prop_done: true }, allDefs) },
        p2: { id: 'p2' },
      })
    await mountTable(sourceWith())
    await act(async () => {
      host.querySelectorAll<HTMLElement>('.data-cell')[2].click()
    })
    expect(mutateSpy).toHaveBeenCalledWith({
      op: 'setProperty',
      path: 'Col/Page One.md',
      propertyId: 'prop_done',
      value: null,
    })
  })
})

describe('optimistic value persistence', () => {
  it('a just-assigned value survives a source-identity change (watcher echo) — the assign-vanish guard', async () => {
    await mountTable(sourceWith())
    const doneCell = (): HTMLElement => host.querySelectorAll<HTMLElement>('.data-cell')[2]
    // Check the box → optimistic valueOverride (prop_done: true); the check glyph shows.
    await act(async () => {
      doneCell().click()
    })
    expect(doneCell().querySelector('svg')).toBeTruthy()
    // A watcher self-echo re-mints `source`'s object identity (same id/path, so the container-open
    // effect stays put). The value override must NOT be dropped — else the glyph reverts to the frozen
    // pre-assign values, which is the ~1/10 assign-vanish this guards.
    await act(async () => {
      root.render(<TableView source={sourceWith()} />)
    })
    await act(async () => {})
    expect(doneCell().querySelector('svg')).toBeTruthy()
  })
})

describe('Context cells', () => {
  const contextCell = (): HTMLElement => host.querySelectorAll<HTMLElement>('.data-cell')[6] // ctx_areas last

  it("click opens the context picker listing the Context's Spaces; toggling writes setContext", async () => {
    await mountTable(sourceWith())
    await act(async () => {
      contextCell().click()
    })
    expect(pickerText()).toContain('Work')
    expect(pickerText()).toContain('Personal')

    const work = pickerButtons().find((b) => b.textContent?.includes('Work'))
    await act(async () => {
      work?.click()
    })
    expect(mutateSpy).toHaveBeenCalledWith({
      op: 'setContext',
      path: 'Col/Page One.md',
      contextId: 'ctx_areas',
      spaceIds: ['area_work'],
    })
  })
})

describe('number cell inline editing', () => {
  const numberCell = (): HTMLElement => host.querySelectorAll<HTMLElement>('.data-cell')[3]

  const openEditor = async (): Promise<HTMLInputElement> => {
    await mountTable(sourceWith())
    await act(async () => {
      numberCell().click()
    })
    const input = numberCell().querySelector('input')
    expect(input).toBeTruthy()
    return input as HTMLInputElement
  }

  it('single-click mounts the editor seeded with the value; letters cannot be typed', async () => {
    const input = await openEditor()
    expect(input.value).toBe('42')
    await act(async () => {
      typeInto(input, '42a')
    })
    expect(input.value).toBe('42')
  })

  it('Enter commits the parsed number', async () => {
    const input = await openEditor()
    await act(async () => {
      typeInto(input, '43.5')
      key(input, 'Enter')
    })
    expect(mutateSpy).toHaveBeenCalledWith({
      op: 'setProperty',
      path: 'Col/Page One.md',
      propertyId: 'prop_n',
      value: { kind: 'number', value: 43.5 },
    })
  })

  it('an empty commit clears the value', async () => {
    const input = await openEditor()
    await act(async () => {
      typeInto(input, '')
      key(input, 'Enter')
    })
    expect(mutateSpy).toHaveBeenCalledWith({
      op: 'setProperty',
      path: 'Col/Page One.md',
      propertyId: 'prop_n',
      value: null,
    })
  })

  it('Esc reverts without writing; blur commits', async () => {
    const input = await openEditor()
    await act(async () => {
      typeInto(input, '99')
      key(input, 'Escape')
    })
    expect(mutateSpy).not.toHaveBeenCalled()

    const again = await openEditor()
    await act(async () => {
      typeInto(again, '7')
      again.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    expect(mutateSpy).toHaveBeenCalledWith({
      op: 'setProperty',
      path: 'Col/Page One.md',
      propertyId: 'prop_n',
      value: { kind: 'number', value: 7 },
    })
  })
})

describe('menu-entered editing', () => {
  it('url Edit normalizes a schemeless link on commit', async () => {
    await mountTable(sourceWith())
    ;(window.nexus as { connMenu: unknown }).connMenu = vi.fn(async () => 'editLink')
    const urlCell = host.querySelectorAll<HTMLElement>('.data-cell')[4]
    await act(async () => {
      urlCell.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    const input = urlCell.querySelector('input') as HTMLInputElement
    expect(input.value).toBe('https://old.com')
    await act(async () => {
      typeInto(input, 'example.com')
      key(input, 'Enter')
    })
    expect(mutateSpy).toHaveBeenCalledWith({
      op: 'setProperty',
      path: 'Col/Page One.md',
      propertyId: 'prop_link',
      value: { kind: 'url', value: 'https://example.com' },
    })
  })

  it('title Rename commits a rename op', async () => {
    await mountTable(sourceWith())
    ;(window.nexus as { cellMenu: unknown }).cellMenu = vi.fn(async () => 'title:rename')
    const titleCell = host.querySelectorAll<HTMLElement>('.data-cell')[0]
    await act(async () => {
      titleCell.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    })
    const input = titleCell.querySelector('input') as HTMLInputElement
    expect(input.value).toBe('Page One')
    await act(async () => {
      typeInto(input, 'Renamed Page')
      key(input, 'Enter')
    })
    expect(mutateSpy).toHaveBeenCalledWith({
      op: 'rename',
      path: 'Col/Page One.md',
      kind: 'page',
      newName: 'Renamed Page',
    })
  })
})

describe('open actions + row-click narrowing', () => {
  it('title cell click navigates; row background click does not', async () => {
    await mountTable(sourceWith())
    const cells = host.querySelectorAll<HTMLElement>('.data-cell')
    await act(async () => {
      cells[0].click()
    })
    expect(selectSpy).toHaveBeenCalledWith({ kind: 'page', id: 'p1', path: 'Col/Page One.md' })

    selectSpy.mockClear()
    const row = host.querySelector<HTMLElement>('.data-row')
    await act(async () => {
      row?.click()
    })
    expect(selectSpy).not.toHaveBeenCalled()
  })

  it('url cell click opens externally through the sanctioned IPC, not navigation', async () => {
    await mountTable(sourceWith())
    const link = host.querySelector<HTMLElement>('.cell-link')
    await act(async () => {
      link?.click()
    })
    expect(openExternalSpy).toHaveBeenCalledWith('https://old.com')
    expect(selectSpy).not.toHaveBeenCalled()
  })
})

describe('PropertyPicker (direct mount) — seed values', () => {
  it('a seed status def shows its option values (values show regardless of name)', async () => {
    const { defaultStatusSeed } = await import('@shared/properties')
    const seedDef: PropertyDefinition = {
      id: 'prop_seed',
      name: 'Status',
      type: 'status',
      status_groups: defaultStatusSeed(),
    }
    await act(async () => {
      root.render(
        <PropertyPicker
          def={seedDef}
          current={null}
          open
          triggerRef={{ current: host }}
          onCommit={vi.fn()}
          onDismiss={vi.fn()}
        />,
      )
    })
    const labels = pickerButtons().map((b) => b.textContent)
    expect(labels).toEqual(['Open', 'Active', 'Done'])
  })
})

describe('PropertyPicker (direct mount) — multi-select', () => {
  it('toggles values, staying open, committing the full array each time', async () => {
    const onCommit = vi.fn()
    const onDismiss = vi.fn()
    await act(async () => {
      root.render(
        <PropertyPicker
          def={multiDef}
          current={{ kind: 'multiSelect', value: ['a'] }}
          open
          triggerRef={{ current: host }}
          onCommit={onCommit}
          onDismiss={onDismiss}
        />,
      )
    })
    const beta = pickerButtons().find((b) => b.textContent?.includes('Beta'))
    await act(async () => {
      beta?.click()
    })
    expect(onCommit).toHaveBeenCalledWith({ kind: 'multiSelect', value: ['a', 'b'] })
    expect(onDismiss).not.toHaveBeenCalled() // multi stays open

    const alpha = pickerButtons().find((b) => b.textContent?.includes('Alpha'))
    await act(async () => {
      alpha?.click()
    })
    expect(onCommit).toHaveBeenLastCalledWith({ kind: 'multiSelect', value: [] })
  })
})

describe('chip hover × — the per-chip remove (pill looks only)', () => {
  const chipSource = (): CollectionNode =>
    ({
      kind: 'collection',
      id: 'col1',
      title: 'Col',
      path: 'Col',
      sets: [],
      pages: [
        {
          kind: 'page',
          id: 'p1',
          title: 'Page One',
          path: 'Col/Page One.md',
          contextValues: { ctx_areas: ['area_work', 'area_life'] },
        },
      ],
      properties: [statusDef, multiDef],
      views: [
        {
          id: 'view_1',
          name: 'Table',
          type: 'table',
          property_order: ['_title', 'prop_status', 'prop_tags', 'ctx_areas'],
          hidden_properties: ['_modified_at'],
        },
      ],
    }) as unknown as CollectionNode

  const mountChips = async (): Promise<void> => {
    ;(window.nexus as { loadValues: unknown }).loadValues = async () => ({
      p1: {
        id: 'p1',
        '(Areas)': ['area_work', 'area_life'],
        ...propsAtRoot({ prop_status: 'active', prop_tags: ['a', 'b'] }, allDefs),
      },
    })
    await mountTable(chipSource())
  }
  const cell = (i: number): HTMLElement => host.querySelectorAll<HTMLElement>('.data-cell')[i]
  const removesIn = (el: HTMLElement): HTMLElement[] => [
    ...el.querySelectorAll<HTMLElement>('[aria-label="Remove"]'),
  ]

  it('a status pill × clears the property — and never opens the picker', async () => {
    await mountChips()
    const [x] = removesIn(cell(1))
    expect(x).toBeTruthy()
    await act(async () => {
      x.click()
    })
    expect(mutateSpy).toHaveBeenCalledTimes(1)
    expect(mutateSpy).toHaveBeenCalledWith({
      op: 'setProperty',
      path: 'Col/Page One.md',
      propertyId: 'prop_status',
      value: null,
    })
    expect(host.textContent).not.toContain('Not started') // no picker options mounted
  })

  it('a multi-select pill × removes just THAT option', async () => {
    await mountChips()
    const removes = removesIn(cell(2))
    expect(removes.length).toBe(2) // one × per pill
    await act(async () => {
      removes[0].click()
    })
    expect(mutateSpy).toHaveBeenCalledWith({
      op: 'setProperty',
      path: 'Col/Page One.md',
      propertyId: 'prop_tags',
      value: { kind: 'multiSelect', value: ['b'] },
    })
  })

  it('removing the LAST multi option commits the emptied value (whose write deletes the key)', async () => {
    ;(window.nexus as { loadValues: unknown }).loadValues = async () => ({
      p1: { id: 'p1', ...propsAtRoot({ prop_tags: ['a'] }, allDefs) },
    })
    await mountTable(chipSource())
    const [x] = removesIn(cell(2))
    await act(async () => {
      x.click()
    })
    expect(mutateSpy).toHaveBeenCalledWith({
      op: 'setProperty',
      path: 'Col/Page One.md',
      propertyId: 'prop_tags',
      value: { kind: 'multiSelect', value: [] },
    })
  })

  it('a context chip × writes setContext with the remaining ids', async () => {
    await mountChips()
    const removes = removesIn(cell(3))
    expect(removes.length).toBe(2)
    await act(async () => {
      removes[0].click()
    })
    expect(mutateSpy).toHaveBeenCalledWith({
      op: 'setContext',
      path: 'Col/Page One.md',
      contextId: 'ctx_areas',
      spaceIds: ['area_life'],
    })
  })

  it('a Compact status look carries NO × — Clear lives in its menu', async () => {
    ;(window.nexus as { loadValues: unknown }).loadValues = async () => ({
      p1: { id: 'p1', ...propsAtRoot({ prop_status: 'active' }, allDefs) },
    })
    const styled = chipSource()
    ;(styled.views as Array<{ column_styles?: unknown }>)[0].column_styles = {
      prop_status: { look: 'compact' },
    }
    await mountTable(styled)
    expect(removesIn(cell(1)).length).toBe(0)
  })
})

// The stamp and the hit-test are the two halves of "which file did I click," and they live in
// different files — `Cell.tsx` writes `data-segment-index`, `filePick.ts` reads it back off the
// clicked node. Only a DOM gesture crosses them; a unit test on either half passes while they drift.
describe('file cell gestures — the stamp and the hit-test, crossed', () => {
  const twoFiles = (): CollectionNode => {
    const s = sourceWith()
    ;(window.nexus as { loadValues: unknown }).loadValues = async () => ({
      p1: {
        id: 'p1',
        ...propsAtRoot({ prop_files: ['[[a.pdf]]', '[[b.pdf]]'] }, allDefs),
      },
    })
    return s
  }
  const fileCell = (): HTMLElement => host.querySelectorAll<HTMLElement>('.data-cell')[5]

  beforeEach(() => {
    ;(window.nexus as { pickFile: unknown }).pickFile = vi.fn(async () => '/outside/New.pdf')
    ;(window.nexus as { adoptFile: unknown }).adoptFile = vi.fn(async () => ({
      ok: true,
      value: '[[New.pdf]]',
    }))
  })

  it('clicking the SECOND chip replaces that one — the click lands on the label, not the stamp', async () => {
    await mountTable(twoFiles())
    const label = fileCell().querySelectorAll('[data-segment-index]')[1]?.querySelector('span')
    expect(label).toBeTruthy()
    await act(async () => {
      label?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await act(async () => {})
    expect(mutateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        op: 'setProperty',
        propertyId: 'prop_files',
        value: { kind: 'file', value: ['[[a.pdf]]', '[[New.pdf]]'] },
      }),
    )
  })

  it('clicking the cell around the chips ADDS — nothing stamped is under the cursor', async () => {
    await mountTable(twoFiles())
    await act(async () => {
      fileCell().click()
    })
    await act(async () => {})
    expect(mutateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        op: 'setProperty',
        propertyId: 'prop_files',
        value: { kind: 'file', value: ['[[a.pdf]]', '[[b.pdf]]', '[[New.pdf]]'] },
      }),
    )
  })

  it('the SECOND chip’s × removes that one', async () => {
    await mountTable(twoFiles())
    const x = fileCell().querySelectorAll<HTMLElement>('[aria-label="Remove"]')[1]
    expect(x).toBeTruthy()
    await act(async () => {
      x.click()
    })
    expect(mutateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        op: 'setProperty',
        propertyId: 'prop_files',
        value: { kind: 'file', value: ['[[a.pdf]]'] },
      }),
    )
  })
})
