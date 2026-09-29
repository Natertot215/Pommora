// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import type { Root } from 'react-dom/client'
import type { CollectionNode } from '@pommora/core/Nexus/tree'
import type { PropertyDefinition } from '@pommora/core/Properties/properties'
import type { SavedView } from '@pommora/core/Views/views'
import { firePointer, stubRect } from '@pommora/uix/Testing/pointerHarness'
import { useSession } from '../../Session/store'
import { GroupFrame } from './GroupFrame'
import { stubDialer } from '../../vitest.setup'
import { MenuDoorHost } from '../../Testing/MenuDoorHost'
import { mountEachTest } from '../../Testing/viewHarness'
import { makeTree } from '../../Testing/testTree'

const statusDef: PropertyDefinition = {
  id: 'prop_status',
  name: 'Status',
  type: 'status',
  status_groups: [
    {
      id: 'g1',
      label: 'Open',
      color: 'gray',
      options: [{ value: 'Queued', group_id: 'g1' }],
    },
  ],
}
const dateDef: PropertyDefinition = { id: 'prop_when', name: 'When', type: 'dateTime' }

const view = (over?: Partial<SavedView>): SavedView => ({
  id: 'view_1',
  name: 'Table',
  type: 'table',
  property_order: ['_title'],
  hidden_properties: [],
  group: { kind: 'structural' },
  ...over,
})

const source = {
  kind: 'collection',
  id: 'col1',
  title: 'Col',
  path: 'Col',
  sets: [],
  pages: [],
  properties: [statusDef, dateDef],
} as unknown as CollectionNode

let host: HTMLDivElement
let root: Root
mountEachTest((h, r) => {
  host = h
  root = r
})
let saveSpy: ReturnType<typeof vi.fn>

const mount = async (v: SavedView): Promise<void> => {
  await act(async () => {
    root.render(
      <MenuDoorHost>
        <GroupFrame
          source={source}
          view={v}
          schema={[statusDef, dateDef]}
          label="Settings"
          onBack={() => {}}
        />
      </MenuDoorHost>,
    )
  })
}
const texts = (): string => host.textContent ?? ''
const menuTexts = (): string => document.body.textContent ?? ''
const openPicker = async (label: string): Promise<void> => {
  await act(async () => {
    ;(document.querySelector(`button[aria-label="${label}"]`) as HTMLElement).click()
  })
}
const pickOption = async (t: string): Promise<void> => {
  const el = [...document.querySelectorAll('button, [role="button"]')]
    .filter((e) => e.textContent === t)
    .at(-1)
  await act(async () => {
    ;(el as HTMLElement).click()
  })
}

beforeEach(() => {
  saveSpy = vi.fn(async () => ({ ok: true, value: { id: 'v1' } }))
  ;(window as unknown as { nexus: unknown }).nexus = stubDialer({
    'views:save': saveSpy,
    'view:loadValues': vi.fn(async () => ({ ok: true, value: {} })),
  })
  useSession.setState({ load: vi.fn(async () => {}) as never })
})

const lastSaved = (): SavedView => saveSpy.mock.calls.at(-1)?.[2] as SavedView

describe('GroupFrame rows', () => {
  it('structural: Group By Location + Order (Custom) + Sub-Group; no Date By', async () => {
    await mount(view())
    expect(texts()).toContain('Group By')
    expect(texts()).toContain('Location')
    expect(texts()).toContain('Order')
    expect(texts()).toContain('Sub-Group')
    expect(texts()).toContain('Custom')
    expect(texts()).not.toContain('Date By')
  })

  it('date property grouping: Date By renders with Month; Sub-Group hides', async () => {
    await mount(
      view({
        group: {
          kind: 'property',
          property_id: 'prop_when',
          order_mode: 'configured',
        },
      }),
    )
    expect(texts()).toContain('Date By')
    expect(texts()).toContain('Month')
    expect(texts()).not.toContain('Sub-Group')
  })

  it('sub-grouped: the Sub-Order row appears and a date sub-group grows its own Date By', async () => {
    await mount(view({ sub_group: { property_id: 'prop_when', order_mode: 'configured' } }))
    expect(texts()).toContain('Sub-Group')
    expect(texts()).toContain('Date By')
    expect(texts()).toContain('Ascending')
  })

  it('the Group By picker lists Location + groupable properties and a pick writes the group', async () => {
    await mount(view())
    await openPicker('Group By')
    expect(menuTexts()).toContain('Location')
    expect(menuTexts()).toContain('Status')
    expect(menuTexts()).toContain('When')
    await pickOption('Status')
    expect(lastSaved().group).toMatchObject({
      kind: 'property',
      property_id: 'prop_status',
      order_mode: 'configured',
    })
  })

  it('structural: the middle region lists the set hierarchy; sub-grouped flattens it', async () => {
    const nested = {
      ...source,
      sets: [
        {
          kind: 'set',
          id: 'sA',
          title: 'Alpha',
          path: 'Col/Alpha',
          pages: [],
          sets: [
            {
              kind: 'set',
              id: 'sA1',
              title: 'Nested',
              path: 'Col/Alpha/Nested',
              pages: [],
              sets: [],
            },
          ],
        },
        { kind: 'set', id: 'sB', title: 'Beta', path: 'Col/Beta', pages: [], sets: [] },
      ],
    } as unknown as CollectionNode
    await act(async () => {
      root.render(
        <MenuDoorHost>
          <GroupFrame
            source={nested}
            view={view()}
            schema={[statusDef, dateDef]}
            label="Settings"
            onBack={() => {}}
          />
        </MenuDoorHost>,
      )
    })
    expect(texts()).toContain('Alpha')
    expect(texts()).not.toContain('Nested')
    expect(texts()).toContain('Beta')
    const alphaRow = [...host.querySelectorAll('*')]
      .filter((el) => el.textContent === 'Alpha')
      .at(-1)
    await act(async () => {
      ;(alphaRow!.closest('[class]') as HTMLElement).click()
    })
    expect(texts()).toContain('Nested')
    await act(async () => {
      root.render(
        <MenuDoorHost>
          <GroupFrame
            source={nested}
            view={view({ sub_group: { property_id: 'prop_status', order_mode: 'configured' } })}
            schema={[statusDef, dateDef]}
            label="Settings"
            onBack={() => {}}
          />
        </MenuDoorHost>,
      )
    })
    expect(texts()).toContain('Alpha')
    expect(texts()).not.toContain('Nested')
  })

  it('footings: Ungrouped + Hide Empty Groups under every grouping; Separation under numeric date formats', async () => {
    await mount(view())
    expect(texts()).toContain('Ungrouped')
    expect(texts()).toContain('Hide Empty Groups')
    expect(texts()).not.toContain('Separation')
    await mount(
      view({
        group: {
          kind: 'property',
          property_id: 'prop_status',
          order_mode: 'configured',
        },
      }),
    )
    expect(texts()).toContain('Hide Empty Groups')
    await mount(
      view({
        group: {
          kind: 'property',
          property_id: 'prop_when',
          order_mode: 'configured',
        },
        column_styles: { prop_when: { date_format: 'monthDayYear' } },
      }),
    )
    expect(texts()).toContain('Separation')
  })

  it('an option row’s eye toggles its value in hidden_groups (add, then remove)', async () => {
    const propView = view({
      group: {
        kind: 'property',
        property_id: 'prop_status',
        order_mode: 'configured',
      },
    })
    await mount(propView)
    const eye = host.querySelector('button[aria-label="Hide Queued"]') as HTMLElement
    await act(async () => {
      eye.click()
    })
    expect(lastSaved().hidden_groups).toEqual(['prop_status/Queued'])
    await mount({ ...propView, hidden_groups: ['Queued'] })
    const unhide = host.querySelector('button[aria-label="Show Queued"]') as HTMLElement
    await act(async () => {
      unhide.click()
    })
    expect(lastSaved().hidden_groups).toEqual([])
  })

  it('a date bucket hidden under its legacy bare key keeps a row, and showing it drops the key', async () => {
    await mount(
      view({
        group: { kind: 'property', property_id: 'prop_when', order_mode: 'configured' },
        hidden_groups: ['2024-05'],
      }),
    )
    const shown = host.querySelectorAll('button[aria-label^="Show "]')
    expect(shown).toHaveLength(1)
    await act(async () => {
      ;(shown[0] as HTMLElement).click()
    })
    expect(lastSaved().hidden_groups).toEqual([])
  })

  it('the Hide Empty Groups switch writes the view-level knob', async () => {
    await mount(view())
    const sw = host.querySelector('button[aria-label="Hide Empty Groups"]') as HTMLElement
    await act(async () => {
      sw.click()
    })
    expect(lastSaved().hide_empty_groups).toBe(true)
    expect(lastSaved().group).toEqual({ kind: 'structural' })
  })

  it('the Ungrouped footing toggles ungrouped_placement in place (dual-option control)', async () => {
    await mount(view())
    const trigger = host.querySelector('button[aria-label="Ungrouped"]') as HTMLElement
    // Two options → a toggleable double-chevron: one click flips the default 'bottom' to 'top'.
    await act(async () => {
      trigger.click()
    })
    expect(lastSaved().ungrouped_placement).toBe('top')
  })

  it('status default order shows the grouped preview; custom shows the flat Options list', async () => {
    await mount(
      view({
        group: {
          kind: 'property',
          property_id: 'prop_status',
          order_mode: 'configured',
        },
      }),
    )
    expect(texts()).toContain('Open')
    expect(texts()).toContain('Queued')
    expect(texts()).not.toContain('Options')
    await mount(
      view({
        group: {
          kind: 'property',
          property_id: 'prop_status',
          order_mode: 'manual',
        },
      }),
    )
    expect(texts()).toContain('Options')
    expect(texts()).toContain('Queued')
  })

  it('a dead-property grouping wears the structural chrome (the pipeline fallback, mirrored)', async () => {
    await mount(
      view({
        group: {
          kind: 'property',
          property_id: 'prop_gone',
          order_mode: 'configured',
        },
      }),
    )
    expect(texts()).toContain('Location')
    expect(texts()).toContain('Sub-Group')
  })

  it("a sub-group the engine won't draw reads as none: no Sub-Order row", async () => {
    await mount(view({ sub_group: { property_id: 'prop_gone', order_mode: 'configured' } }))
    expect(texts().split('Order').length - 1).toBe(1)
  })

  it('Group By None shows no Order picker, since no Set order reads it', async () => {
    await mount(view({ group: { kind: 'flat' } }))
    expect(texts()).not.toContain('Order')
  })

  it('switching Group By away and back preserves sub_group (view-level survival)', async () => {
    const v = view({
      sub_group: { property_id: 'prop_status', order_mode: 'manual', order: ['Queued'] },
    })
    await mount(v)
    await openPicker('Group By')
    await pickOption('Status')
    expect(lastSaved().sub_group).toEqual({
      property_id: 'prop_status',
      order_mode: 'manual',
      order: ['Queued'],
    })
  })
})

describe('GroupFrame lists — dragging in the pane', () => {
  const twoStatus: PropertyDefinition = {
    ...statusDef,
    status_groups: [
      {
        id: 'g1',
        label: 'Open',
        color: 'gray',
        options: [{ value: 'Queued', group_id: 'g1' }],
      },
      {
        id: 'g2',
        label: 'Closed',
        color: 'green',
        options: [{ value: 'Done', group_id: 'g2' }],
      },
    ],
  }
  const withStatus = (v: SavedView, src: CollectionNode = source): Promise<void> =>
    act(async () => {
      root.render(
        <MenuDoorHost>
          <GroupFrame
            source={src}
            view={v}
            schema={[twoStatus, dateDef]}
            label="Settings"
            onBack={() => {}}
          />
        </MenuDoorHost>,
      )
    })
  const statusView = (order_mode: 'configured' | 'reversed'): SavedView =>
    view({ group: { kind: 'property', property_id: 'prop_status', order_mode } })
  const lineRows = (): HTMLElement[] => [...host.querySelectorAll<HTMLElement>('[data-line-row]')]
  const lay = (): void => {
    const zone = host.querySelector('.drop-line-host')
    if (zone) stubRect(zone, { top: 0, bottom: lineRows().length * 30 })
    for (const [i, el] of lineRows().entries()) stubRect(el, { top: i * 30, bottom: i * 30 + 30 })
  }
  const dragRow = async (from: number, toY: number): Promise<void> => {
    await act(async () => {
      firePointer(lineRows()[from], 'pointerdown', { x: 10, y: from * 30 + 15 })
    })
    await act(async () => {
      firePointer(window, 'pointermove', { x: 10, y: toY })
    })
    await act(async () => {
      firePointer(window, 'pointerup')
    })
  }

  it('picking Custom keeps the on-screen order', async () => {
    await withStatus(statusView('reversed'))
    await openPicker('Order')
    await pickOption('Custom')
    expect(lastSaved().group).toEqual({
      kind: 'property',
      property_id: 'prop_status',
      order_mode: 'manual',
      order: ['Done', 'Queued'],
    })
  })

  it('a Default list drag switches to Custom silently', async () => {
    await withStatus(statusView('configured'))
    lay()
    await dragRow(1, 5)
    expect(lastSaved().group).toEqual({
      kind: 'property',
      property_id: 'prop_status',
      order_mode: 'manual',
      order: ['Done', 'Queued'],
    })
    expect(document.querySelector('[role="status"]')?.textContent ?? '').not.toContain('Switched')
  })

  it('a Set move paints ahead in the pane while its save is pending', async () => {
    const sets = {
      ...source,
      sets: [
        { kind: 'set', id: 'sA', title: 'Alpha', path: 'Col/Alpha', pages: [], sets: [] },
        { kind: 'set', id: 'sB', title: 'Beta', path: 'Col/Beta', pages: [], sets: [] },
      ],
    } as unknown as CollectionNode
    let land: (outcome: null) => void = () => {}
    useSession.setState({
      tree: { ...makeTree(), collections: [sets] },
      mutate: vi.fn(() => new Promise((resolve) => (land = resolve))) as never,
    })
    await withStatus(view({ structural_order_mode: 'location' }), sets)
    lay()
    await dragRow(1, 5)
    expect(lineRows().map((r) => r.textContent)).toEqual(['Beta', 'Alpha'])
    await act(async () => land(null))
  })

  it('the pane lists and moves Sets in the view order under Group By None', async () => {
    const sets = {
      ...source,
      sets: [
        { kind: 'set', id: 'sA', title: 'Alpha', path: 'Col/Alpha', pages: [], sets: [] },
        { kind: 'set', id: 'sB', title: 'Beta', path: 'Col/Beta', pages: [], sets: [] },
        { kind: 'set', id: 'sC', title: 'Gamma', path: 'Col/Gamma', pages: [], sets: [] },
      ],
    } as unknown as CollectionNode
    await withStatus(view({ group: { kind: 'flat' }, group_order: ['sC', 'sA', 'sB'] }), sets)
    expect(lineRows().map((r) => r.textContent)).toEqual(['Gamma', 'Alpha', 'Beta'])
    lay()
    await dragRow(1, 89)
    expect(lastSaved().group_order).toEqual(['sC', 'sB', 'sA'])
  })
})
